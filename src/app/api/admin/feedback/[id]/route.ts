import { withAdmin } from '@/server/guard';
import { errorResponse, jsonResponse, readJsonBody } from '@/server/responses';
import { logAudit } from '@/server/services/audit';
import { FeedbackRecord } from '@/server/types';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ id: string }> };

/** PUT /api/admin/feedback/:id — nur den Status umschalten. */
export async function PUT(request: Request, { params }: Params): Promise<Response> {
  const { id } = await params;

  return withAdmin('PUT /api/admin/feedback/:id', async ({ db, auth }) => {
    const body = await readJsonBody<{ status?: string }>(request);
    if (!body) return errorResponse('Ungültiger Request-Body.', 400);

    const status = (body.status ?? '').trim();
    if (status !== 'new' && status !== 'done') {
      return errorResponse('Unbekannter Status.', 400);
    }

    const updated = await db.prepare(
      'UPDATE feedback SET status = ? WHERE id = ? RETURNING *'
    ).bind(status, id).first<FeedbackRecord>();

    if (!updated) return errorResponse('Rückmeldung nicht gefunden.', 404);

    await logAudit(
      db, auth.userId, 'update', 'feedback', id,
      status === 'done' ? 'Rückmeldung erledigt' : 'Rückmeldung wieder offen',
    );

    return jsonResponse(updated);
  });
}

/** DELETE /api/admin/feedback/:id */
export async function DELETE(_request: Request, { params }: Params): Promise<Response> {
  const { id } = await params;

  return withAdmin('DELETE /api/admin/feedback/:id', async ({ db, auth }) => {
    const existing = await db.prepare(
      'SELECT id FROM feedback WHERE id = ?'
    ).bind(id).first<{ id: string }>();

    if (!existing) return errorResponse('Rückmeldung nicht gefunden.', 404);

    await db.prepare('DELETE FROM feedback WHERE id = ?').bind(id).run();
    await logAudit(db, auth.userId, 'delete', 'feedback', id, 'Rückmeldung gelöscht');

    return jsonResponse({ ok: true, deleted: id });
  });
}
