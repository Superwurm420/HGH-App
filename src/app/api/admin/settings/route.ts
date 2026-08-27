import { withAdmin } from '@/server/guard';
import { errorResponse, jsonResponse, readJsonBody } from '@/server/responses';
import { logAudit } from '@/server/services/audit';
import { loadAllSettings, EDITABLE_SETTING_KEYS, isEditableSettingKey } from '@/server/services/settings';

export const dynamic = 'force-dynamic';

/** GET /api/admin/settings — alle Einstellungen. */
export async function GET(): Promise<Response> {
  return withAdmin('GET /api/admin/settings', async ({ db }) => {
    return jsonResponse({ settings: await loadAllSettings(db) });
  });
}

/**
 * PUT /api/admin/settings
 *
 * Nimmt entweder einen einzelnen Schlüssel (`{ key, value }`) oder mehrere auf
 * einmal (`{ settings: { key: value } }`) — der Einstellungen-Tab speichert das
 * ganze Formular in einem Rutsch.
 */
export async function PUT(request: Request): Promise<Response> {
  return withAdmin('PUT /api/admin/settings', async ({ db, auth }) => {
    const body = await readJsonBody<{
      key?: string;
      value?: string;
      settings?: Record<string, string>;
    }>(request);
    if (!body) return errorResponse('Ungültiger Request-Body.', 400);

    const updates: Record<string, string> = body.settings
      ? { ...body.settings }
      : body.key
        ? { [body.key]: body.value ?? '' }
        : {};

    const keys = Object.keys(updates);
    if (keys.length === 0) {
      return errorResponse('Keine Einstellungen übergeben.', 400);
    }

    const unknown = keys.filter((key) => !isEditableSettingKey(key));
    if (unknown.length > 0) {
      return errorResponse(
        `Unbekannte Einstellung: ${unknown.join(', ')}. Erlaubt sind: ${EDITABLE_SETTING_KEYS.join(', ')}.`,
        400,
      );
    }

    await db.batch(
      keys.map((key) =>
        db.prepare(
          `INSERT INTO app_settings (key, value, updated_at, updated_by)
           VALUES (?, ?, datetime('now'), ?)
           ON CONFLICT(key) DO UPDATE SET
             value = excluded.value,
             updated_at = excluded.updated_at,
             updated_by = excluded.updated_by`
        ).bind(key, updates[key] ?? '', auth.userId)
      ),
    );

    await logAudit(db, auth.userId, 'update', 'setting', keys.join(','), `Einstellungen gespeichert: ${keys.join(', ')}`);

    return jsonResponse({ ok: true, keys });
  });
}
