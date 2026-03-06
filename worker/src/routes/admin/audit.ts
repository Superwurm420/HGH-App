import { Env, AuditLog } from '../../types';
import { jsonResponse } from '../../router';
import { requireAuth } from '../../middleware/auth';

/**
 * GET /api/admin/audit?limit=50&offset=0
 * Zeigt die Audit-Logs.
 */
export async function handleAdminAuditLogs(request: Request, env: Env): Promise<Response> {
  const auth = await requireAuth(request, env);
  if (auth instanceof Response) return auth;

  const url = new URL(request.url);
  const limit = Math.min(Number(url.searchParams.get('limit')) || 50, 200);
  const offset = Number(url.searchParams.get('offset')) || 0;

  const rows = await env.DB.prepare(
    'SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT ? OFFSET ?'
  ).bind(limit, offset).all<AuditLog>();

  const countResult = await env.DB.prepare(
    'SELECT COUNT(*) as total FROM audit_logs'
  ).first<{ total: number }>();

  return jsonResponse({
    logs: rows.results,
    total: countResult?.total ?? 0,
    limit,
    offset,
  });
}
