import { getDb } from '@/server/env';
import { jsonResponse, withErrorHandling } from '@/server/responses';
import { loadActiveEvents } from '@/server/services/events';

export const dynamic = 'force-dynamic';

/** GET /api/events?klasse=HT11 — anstehende Termine. */
export async function GET(request: Request): Promise<Response> {
  return withErrorHandling('GET /api/events', async () => {
    const klasse = new URL(request.url).searchParams.get('klasse');
    const events = await loadActiveEvents(await getDb(), klasse);
    return jsonResponse({ events });
  });
}
