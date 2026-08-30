import { getDb } from '@/server/env';
import { jsonResponse, withErrorHandling } from '@/server/responses';
import { loadActiveAnnouncements } from '@/server/services/announcements';

export const dynamic = 'force-dynamic';

/**
 * Kurzer Browser-Cache. Die Inhalte ändern sich selten; eine Minute nimmt
 * mehrfachen Abrufen desselben Geräts die Anfrage ab, ohne dass eine Änderung
 * spürbar später ankommt. `stale-while-revalidate` liefert danach weiter sofort
 * und aktualisiert im Hintergrund.
 */
const PUBLIC_CACHE = 'public, max-age=60, stale-while-revalidate=300';

/** GET /api/announcements?klasse=HT11 — aktive Ankündigungen. */
export async function GET(request: Request): Promise<Response> {
  return withErrorHandling('GET /api/announcements', async () => {
    const klasse = new URL(request.url).searchParams.get('klasse');
    const announcements = await loadActiveAnnouncements(await getDb(), klasse);
    return jsonResponse({ announcements }, 200, { 'Cache-Control': PUBLIC_CACHE });
  });
}
