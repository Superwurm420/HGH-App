import { getEnv } from './env';
import { requireAuth } from './auth';
import { withErrorHandling } from './responses';
import { AuthContext } from './types';

export interface AdminContext {
  env: CloudflareEnv;
  db: D1Database;
  auth: AuthContext;
}

/**
 * Klammert jeden Admin-Handler: Bindings holen, Anmeldung prüfen, Fehler abfangen.
 *
 * Ohne diesen Wrapper stünden die drei Schritte in jeder der Admin-Routen erneut —
 * und eine vergessene Prüfung wäre eine offene Tür.
 */
export async function withAdmin(
  label: string,
  handler: (ctx: AdminContext) => Promise<Response>,
): Promise<Response> {
  return withErrorHandling(label, async () => {
    const env = await getEnv();
    const auth = await requireAuth(env.DB);
    if (auth instanceof Response) return auth;
    return handler({ env, db: env.DB, auth });
  });
}
