import { cookies } from 'next/headers';

import { withAdmin } from '@/server/guard';
import { errorResponse, jsonResponse, readJsonBody } from '@/server/responses';
import { COOKIE_NAME, changePassword } from '@/server/auth';
import { logAudit } from '@/server/services/audit';

export const dynamic = 'force-dynamic';

const MESSAGES: Record<string, string> = {
  'leer': 'Bitte ein Passwort eingeben.',
  'unveraendert': 'Das neue Passwort ist mit dem bisherigen identisch.',
  'falsches-passwort': 'Das bisherige Passwort stimmt nicht.',
  'kein-konto': 'Das Konto existiert nicht mehr.',
};

/**
 * POST /api/admin/password — Body: { currentPassword?, newPassword }
 *
 * Vergibt das eigene Passwort: die Erstvergabe nach der Ersteinrichtung
 * genauso wie jeden späteren Wechsel. `currentPassword` ist nur nötig, wenn
 * bereits eines gesetzt ist — `changePassword` entscheidet das anhand des
 * Kontos, nicht anhand der Eingabe.
 *
 * Die einzige Admin-Route mit `allowWithoutPassword`: Sie muss auch dann
 * erreichbar sein, wenn der Guard sonst alles sperrt, sonst käme man aus dem
 * passwortlosen Zustand nicht heraus.
 *
 * Die aktuelle Sitzung bleibt bestehen, alle anderen werden beendet.
 */
export async function POST(request: Request): Promise<Response> {
  return withAdmin('POST /api/admin/password', async ({ db, auth }) => {
    const body = await readJsonBody<{ currentPassword?: string; newPassword?: string }>(request);
    if (!body) return errorResponse('Ungültiger Request-Body.', 400);

    const currentPassword = body.currentPassword ?? '';
    const newPassword = body.newPassword ?? '';

    if (!newPassword) {
      return errorResponse('Ein neues Passwort ist erforderlich.', 400);
    }

    // Vor dem Setzen merken: danach ist mustSetPassword immer false.
    const isFirstPassword = auth.mustSetPassword;

    const keepToken = (await cookies()).get(COOKIE_NAME)?.value;
    const result = await changePassword(db, auth.userId, currentPassword, newPassword, keepToken);

    if (!result.ok) {
      // Ein falsches bisheriges Passwort ist ein Authentifizierungsfehler,
      // die übrigen Fälle sind Eingabefehler.
      const status = result.reason === 'falsches-passwort' ? 401 : 400;
      await logAudit(db, auth.userId, 'password_change_failed', 'user', auth.userId, result.reason);
      return errorResponse(MESSAGES[result.reason] ?? 'Passwort konnte nicht gesetzt werden.', status);
    }

    await logAudit(
      db,
      auth.userId,
      isFirstPassword ? 'password_set' : 'password_change',
      'user',
      auth.userId,
      isFirstPassword ? 'Erstes Passwort vergeben' : 'Passwort geändert',
    );

    return jsonResponse({ ok: true });
  }, { allowWithoutPassword: true });
}
