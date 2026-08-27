import { withAdmin } from '@/server/guard';
import { jsonResponse } from '@/server/responses';
import { AuditLog } from '@/server/types';

export const dynamic = 'force-dynamic';

/** GET /api/admin/audit?limit=50&offset=0 */
export async function GET(request: Request): Promise<Response> {
  return withAdmin('GET /api/admin/audit', async ({ db }) => {
    const params = new URL(request.url).searchParams;
    const limit = Math.min(Math.max(Number(params.get('limit')) || 50, 1), 200);
    const offset = Math.max(Number(params.get('offset')) || 0, 0);

    const rows = await db.prepare(
      'SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT ? OFFSET ?'
    ).bind(limit, offset).all<AuditLog>();

    const total = await db.prepare(
      'SELECT COUNT(*) AS total FROM audit_logs'
    ).first<{ total: number }>();

    return jsonResponse({ logs: rows.results, total: total?.total ?? 0, limit, offset });
  });
}
