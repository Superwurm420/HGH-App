import { getDb } from '@/server/env';
import { jsonResponse, withErrorHandling } from '@/server/responses';
import { loadPublicSettings } from '@/server/services/settings';

export const dynamic = 'force-dynamic';

/**
 * Kurzer Browser-Cache. Die Inhalte ändern sich selten; eine Minute nimmt
 * mehrfachen Abrufen desselben Geräts die Anfrage ab, ohne dass eine Änderung
 * spürbar später ankommt. `stale-while-revalidate` liefert danach weiter sofort
 * und aktualisiert im Hintergrund.
 */
const PUBLIC_CACHE = 'public, max-age=60, stale-while-revalidate=300';

/** GET /api/settings — öffentlich lesbare App-Einstellungen. */
export async function GET(): Promise<Response> {
  return withErrorHandling('GET /api/settings', async () => {
    return jsonResponse({ settings: await loadPublicSettings(await getDb()) }, 200, { 'Cache-Control': PUBLIC_CACHE });
  });
}
