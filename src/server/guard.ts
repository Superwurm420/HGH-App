import { getEnv } from './env';
import { requireAuth } from './auth';
import { errorResponse, withErrorHandling } from './responses';
import { AuthContext } from './types';

interface AdminContext {
  env: CloudflareEnv;
  db: D1Database;
  auth: AuthContext;
}

interface AdminGuardOptions {
  /**
   * Lässt den Handler auch dann zu, wenn für das Konto noch kein Passwort
   * vergeben ist. Genau eine Route darf das: die, über die man es vergibt.
   */
  allowWithoutPassword?: boolean;
}

/**
 * Klammert jeden Admin-Handler: Bindings holen, Anmeldung prüfen, Fehler abfangen.
 *
 * Ohne diesen Wrapper stünden die drei Schritte in jeder der Admin-Routen erneut —
 * und eine vergessene Prüfung wäre eine offene Tür.
 *
 * Hier wird außerdem der Passwortzwang durchgesetzt. Er steckt bewusst im
 * Server und nicht nur in der Oberfläche: Ein Dialog im Browser lässt sich
 * umgehen, indem man die API direkt anspricht. Solange kein Passwort gesetzt
 * ist, ist das Konto praktisch offen — es darf in diesem Zustand nichts tun
 * können außer diesen einen Zustand zu beenden.
 */
export async function withAdmin(
  label: string,
  handler: (ctx: AdminContext) => Promise<Response>,
  options: AdminGuardOptions = {},
): Promise<Response> {
  return withErrorHandling(label, async () => {
    const env = await getEnv();
    const auth = await requireAuth(env.DB);
    if (auth instanceof Response) return auth;

    if (auth.mustSetPassword && !options.allowWithoutPassword) {
      return errorResponse('Bitte zuerst ein eigenes Passwort vergeben.', 403);
    }

    return handler({ env, db: env.DB, auth });
  });
}
