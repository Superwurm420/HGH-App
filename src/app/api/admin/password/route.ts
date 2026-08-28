import { cookies } from 'next/headers';

import { withAdmin } from '@/server/guard';
import { errorResponse, jsonResponse, readJsonBody } from '@/server/responses';
import { COOKIE_NAME, MIN_PASSWORD_LENGTH, changePassword } from '@/server/auth';
import { logAudit } from '@/server/services/audit';

export const dynamic = 'force-dynamic';

const MESSAGES: Record<string, string> = {
  'zu-kurz': `Das neue Passwort muss mindestens ${MIN_PASSWORD_LENGTH} Zeichen lang sein.`,
  'unveraendert': 'Das neue Passwort ist mit dem bisherigen identisch.',
  'falsches-passwort': 'Das bisherige Passwort stimmt nicht.',
  'kein-konto': 'Das Konto existiert nicht mehr.',
};

/**
 * POST /api/admin/password — Body: { currentPassword, newPassword }
 *
 * Ändert das eigene Passwort. Die aktuelle Sitzung bleibt bestehen, alle
 * anderen werden beendet.
 */
export async function POST(request: Request): Promise<Response> {
  return withAdmin('POST /api/admin/password', async ({ db, auth }) => {
    const body = await readJsonBody<{ currentPassword?: string; newPassword?: string }>(request);
    if (!body) return errorResponse('Ungültiger Request-Body.', 400);

    const currentPassword = body.currentPassword ?? '';
    const newPassword = body.newPassword ?? '';

    if (!currentPassword || !newPassword) {
      return errorResponse('Bisheriges und neues Passwort sind erforderlich.', 400);
    }

    const keepToken = (await cookies()).get(COOKIE_NAME)?.value;
    const result = await changePassword(db, auth.userId, currentPassword, newPassword, keepToken);

    if (!result.ok) {
      // Ein falsches bisheriges Passwort ist ein Authentifizierungsfehler,
      // die übrigen Fälle sind Eingabefehler.
      const status = result.reason === 'falsches-passwort' ? 401 : 400;
      await logAudit(db, auth.userId, 'password_change_failed', 'user', auth.userId, result.reason);
      return errorResponse(MESSAGES[result.reason] ?? 'Passwort konnte nicht geändert werden.', status);
    }

    await logAudit(db, auth.userId, 'password_change', 'user', auth.userId, 'Passwort geändert');

    return jsonResponse({ ok: true });
  });
}
