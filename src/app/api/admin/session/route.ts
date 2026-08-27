import { getDb } from '@/server/env';
import { jsonResponse, withErrorHandling } from '@/server/responses';
import { getAuth } from '@/server/auth';

export const dynamic = 'force-dynamic';

/** GET /api/admin/session — prüft, ob die aktuelle Session gültig ist. */
export async function GET(): Promise<Response> {
  return withErrorHandling('GET /api/admin/session', async () => {
    const auth = await getAuth(await getDb());
    if (!auth) return jsonResponse({ authenticated: false });
    return jsonResponse({ authenticated: true, username: auth.username });
  });
}
