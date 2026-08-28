import { getDb } from '@/server/env';
import { jsonResponse, withErrorHandling } from '@/server/responses';
import { loadPublicSettings } from '@/server/services/settings';

export const dynamic = 'force-dynamic';

/** GET /api/settings — öffentlich lesbare App-Einstellungen. */
export async function GET(): Promise<Response> {
  return withErrorHandling('GET /api/settings', async () => {
    return jsonResponse({ settings: await loadPublicSettings(await getDb()) });
  });
}
