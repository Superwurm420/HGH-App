import { cookies } from 'next/headers';

import { getDb } from '@/server/env';
import { jsonResponse, withErrorHandling } from '@/server/responses';
import { COOKIE_NAME, destroySession, withSessionCookie } from '@/server/auth';

export const dynamic = 'force-dynamic';

/** POST /api/admin/logout */
export async function POST(request: Request): Promise<Response> {
  return withErrorHandling('POST /api/admin/logout', async () => {
    const token = (await cookies()).get(COOKIE_NAME)?.value;
    if (token) {
      await destroySession(await getDb(), token);
    }
    return withSessionCookie(jsonResponse({ ok: true }), request, '', 0);
  });
}
