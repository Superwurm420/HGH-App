import { getDb } from '@/server/env';
import { jsonResponse, withErrorHandling } from '@/server/responses';
import { loadClasses } from '@/server/services/timetable';

export const dynamic = 'force-dynamic';

/** GET /api/timetable/classes — alle Klassen im aktiven Stundenplan. */
export async function GET(): Promise<Response> {
  return withErrorHandling('GET /api/timetable/classes', async () => {
    return jsonResponse({ classes: await loadClasses(await getDb()) });
  });
}
