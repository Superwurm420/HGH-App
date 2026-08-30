import { withAdmin } from '@/server/guard';
import { jsonResponse } from '@/server/responses';
import { loadFeedback } from '@/server/services/feedback';

export const dynamic = 'force-dynamic';

/** GET /api/admin/feedback — alle Rückmeldungen, offene zuerst. */
export async function GET(): Promise<Response> {
  return withAdmin('GET /api/admin/feedback', async ({ db }) => {
    return jsonResponse({ feedback: await loadFeedback(db) });
  });
}
