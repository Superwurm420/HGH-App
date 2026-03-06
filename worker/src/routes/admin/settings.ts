import { Env, AppSetting } from '../../types';
import { jsonResponse, errorResponse } from '../../router';
import { logAudit } from '../../services/audit';
import { requireAuth } from '../../middleware/auth';

/**
 * GET /api/admin/settings - Alle Settings
 * PUT /api/admin/settings - Settings aktualisieren (Body: { key, value })
 */
export async function handleAdminSettings(request: Request, env: Env): Promise<Response> {
  const auth = await requireAuth(request, env);
  if (auth instanceof Response) return auth;

  if (request.method === 'GET') {
    const rows = await env.DB.prepare(
      'SELECT * FROM app_settings ORDER BY key'
    ).all<AppSetting>();
    return jsonResponse({ settings: rows.results });
  }

  if (request.method === 'PUT') {
    let body: { key?: string; value?: string };
    try {
      body = await request.json();
    } catch {
      return errorResponse('Ungültiger Request-Body.', 400);
    }

    if (!body.key?.trim()) {
      return errorResponse('Key ist erforderlich.', 400);
    }

    await env.DB.prepare(
      `INSERT OR REPLACE INTO app_settings (key, value, updated_at, updated_by)
       VALUES (?, ?, datetime('now'), ?)`
    ).bind(body.key.trim(), body.value ?? '', auth.userId).run();

    await logAudit(env, auth.userId, 'update', 'setting', body.key, `Setting ${body.key} aktualisiert`);

    return jsonResponse({ ok: true, key: body.key });
  }

  return errorResponse('Methode nicht erlaubt.', 405);
}
