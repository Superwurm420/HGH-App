import { withAdmin } from '@/server/guard';
import { errorResponse, jsonResponse, readJsonBody } from '@/server/responses';
import { logAudit } from '@/server/services/audit';
import { EventRecord } from '@/server/types';
import { normalizeCategory, type EventInput } from '../route';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ id: string }> };

/** PUT /api/admin/events/:id */
export async function PUT(request: Request, { params }: Params): Promise<Response> {
  const { id } = await params;

  return withAdmin('PUT /api/admin/events/:id', async ({ db, auth }) => {
    const body = await readJsonBody<EventInput>(request);
    if (!body) return errorResponse('Ungültiger Request-Body.', 400);

    const title = body.title?.trim();
    const startDate = body.start_date?.trim();
    if (!title) return errorResponse('Titel ist erforderlich.', 400);
    if (!startDate) return errorResponse('Startdatum ist erforderlich.', 400);

    const category = normalizeCategory(body.category);
    if (!category) return errorResponse('Unbekannte Kategorie.', 400);

    const updated = await db.prepare(
      `UPDATE events SET
         title = ?, description = ?, start_date = ?, end_date = ?, all_day = ?, category = ?, classes = ?,
         updated_at = datetime('now')
       WHERE id = ?
       RETURNING *`
    ).bind(
      title,
      (body.description ?? '').trim(),
      startDate,
      (body.end_date ?? '').trim() || null,
      body.all_day === false ? 0 : 1,
      category,
      (body.classes ?? '').trim(),
      id,
    ).first<EventRecord>();

    if (!updated) return errorResponse('Termin nicht gefunden.', 404);

    await logAudit(db, auth.userId, 'update', 'event', id, `Termin bearbeitet: ${title}`);

    return jsonResponse(updated);
  });
}

/** DELETE /api/admin/events/:id */
export async function DELETE(_request: Request, { params }: Params): Promise<Response> {
  const { id } = await params;

  return withAdmin('DELETE /api/admin/events/:id', async ({ db, auth }) => {
    const existing = await db.prepare(
      'SELECT title FROM events WHERE id = ?'
    ).bind(id).first<{ title: string }>();

    if (!existing) return errorResponse('Termin nicht gefunden.', 404);

    await db.prepare('DELETE FROM events WHERE id = ?').bind(id).run();
    await logAudit(db, auth.userId, 'delete', 'event', id, `Termin gelöscht: ${existing.title}`);

    return jsonResponse({ ok: true, deleted: id });
  });
}
