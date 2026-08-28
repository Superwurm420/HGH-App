import { getEnv } from '@/server/env';
import { errorResponse, jsonResponse, readJsonBody, withErrorHandling } from '@/server/responses';
import { authenticate, createSession, withSessionCookie, SESSION_MAX_AGE_SECONDS } from '@/server/auth';
import { logAudit } from '@/server/services/audit';

export const dynamic = 'force-dynamic';

/** POST /api/admin/login — Body: { username, password } */
export async function POST(request: Request): Promise<Response> {
  return withErrorHandling('POST /api/admin/login', async () => {
    const body = await readJsonBody<{ username?: string; password?: string }>(request);
    if (!body) return errorResponse('Ungültiger Request-Body.', 400);

    const username = body.username?.trim();
    const password = body.password;
    if (!username || !password) {
      return errorResponse('Benutzername und Passwort sind erforderlich.', 400);
    }

    const env = await getEnv();
    const result = await authenticate(env, username, password);

    if (!result.ok || !result.userId) {
      return errorResponse('Ungültige Anmeldedaten.', 401);
    }

    const token = await createSession(env.DB, result.userId);
    await logAudit(env.DB, result.userId, 'login', 'user', result.userId);

    return withSessionCookie(
      jsonResponse({
        ok: true,
        username: result.username,
        mustSetPassword: result.mustSetPassword === true,
      }),
      request,
      token,
      SESSION_MAX_AGE_SECONDS,
    );
  });
}
