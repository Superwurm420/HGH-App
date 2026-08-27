import { getDb } from '@/server/env';
import { jsonResponse, withErrorHandling } from '@/server/responses';
import { loadActiveAnnouncements } from '@/server/services/announcements';

export const dynamic = 'force-dynamic';

/** GET /api/announcements?klasse=HT11 — aktive Ankündigungen. */
export async function GET(request: Request): Promise<Response> {
  return withErrorHandling('GET /api/announcements', async () => {
    const klasse = new URL(request.url).searchParams.get('klasse');
    const announcements = await loadActiveAnnouncements(await getDb(), klasse);
    return jsonResponse({ announcements });
  });
}
