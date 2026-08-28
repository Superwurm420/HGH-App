import { adminUsername, getEnv } from '@/server/env';
import { jsonResponse, withErrorHandling } from '@/server/responses';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/setup-status
 *
 * Diagnose für die Ersteinrichtung, bewusst ohne Anmeldung erreichbar: Ohne
 * diese Auskunft steht der Redaktion bei einem Login-Fehler nur „Ungültige
 * Anmeldedaten" zur Verfügung, auch wenn in Wahrheit die Migration fehlt.
 * Es werden nur Ja/Nein-Zustände preisgegeben, keine Geheimnisse.
 */
export async function GET(): Promise<Response> {
  return withErrorHandling('GET /api/admin/setup-status', async () => {
    const env = await getEnv();

    let dbReady = false;
    let hasUsers = false;
    let needsPassword = false;

    try {
      const row = await env.DB.prepare(
        `SELECT COUNT(*) AS cnt,
                SUM(CASE WHEN password_hash = '' THEN 1 ELSE 0 END) AS ohne_passwort
         FROM users`
      ).first<{ cnt: number; ohne_passwort: number | null }>();
      dbReady = true;
      hasUsers = (row?.cnt ?? 0) > 0;
      needsPassword = (row?.ohne_passwort ?? 0) > 0;
    } catch {
      // Tabelle fehlt → Migration wurde noch nicht ausgeführt.
    }

    return jsonResponse({
      dbReady,
      hasUsers,
      needsPassword,
      adminUser: adminUsername(env),
    });
  });
}
