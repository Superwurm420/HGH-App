import { getDb } from '@/server/env';
import { jsonResponse, withErrorHandling } from '@/server/responses';
import { weekdayForToday } from '@/server/services/berlin-time';
import { loadTimetable } from '@/server/services/timetable';

export const dynamic = 'force-dynamic';

/** GET /api/timetable?klasse=HT11 — aktiver Stundenplan, optional nach Klasse gefiltert. */
export async function GET(request: Request): Promise<Response> {
  return withErrorHandling('GET /api/timetable', async () => {
    const klasse = new URL(request.url).searchParams.get('klasse');
    const timetable = await loadTimetable(await getDb(), weekdayForToday(), klasse);
    return jsonResponse(timetable);
  });
}
