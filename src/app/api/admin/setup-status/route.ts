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

    try {
      const count = await env.DB.prepare('SELECT COUNT(*) AS cnt FROM users').first<{ cnt: number }>();
      dbReady = true;
      hasUsers = (count?.cnt ?? 0) > 0;
    } catch {
      // Tabelle fehlt → Migration wurde noch nicht ausgeführt.
    }

    return jsonResponse({
      dbReady,
      hasUsers,
      passwordConfigured: Boolean(env.ADMIN_PASSWORD),
      adminUser: adminUsername(env),
    });
  });
}
