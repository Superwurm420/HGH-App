import { getDb } from '@/server/env';
import { jsonResponse, withErrorHandling } from '@/server/responses';
import { weekdayForToday } from '@/lib/berlin-time';
import { loadTimetable } from '@/server/services/timetable';

export const dynamic = 'force-dynamic';

/**
 * Kurzer Browser-Cache. Die Inhalte ändern sich selten; eine Minute nimmt
 * mehrfachen Abrufen desselben Geräts die Anfrage ab, ohne dass eine Änderung
 * spürbar später ankommt. `stale-while-revalidate` liefert danach weiter sofort
 * und aktualisiert im Hintergrund.
 */
const PUBLIC_CACHE = 'public, max-age=60, stale-while-revalidate=300';

/** GET /api/timetable?klasse=HT11 — aktiver Stundenplan, optional nach Klasse gefiltert. */
export async function GET(request: Request): Promise<Response> {
  return withErrorHandling('GET /api/timetable', async () => {
    const klasse = new URL(request.url).searchParams.get('klasse');
    const timetable = await loadTimetable(await getDb(), weekdayForToday(), klasse);
    return jsonResponse(timetable, 200, { 'Cache-Control': PUBLIC_CACHE });
  });
}
