import { withAdmin } from '@/server/guard';
import { errorResponse, jsonResponse, readJsonBody } from '@/server/responses';
import { logAudit } from '@/server/services/audit';
import { Announcement } from '@/server/types';
import type { AnnouncementInput } from '../route';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ id: string }> };

/** PUT /api/admin/announcements/:id */
export async function PUT(request: Request, { params }: Params): Promise<Response> {
  const { id } = await params;

  return withAdmin('PUT /api/admin/announcements/:id', async ({ db, auth }) => {
    const body = await readJsonBody<AnnouncementInput>(request);
    if (!body) return errorResponse('Ungültiger Request-Body.', 400);

    const title = body.title?.trim();
    const date = body.date?.trim();
    if (!title) return errorResponse('Titel ist erforderlich.', 400);
    if (!date) return errorResponse('Datum ist erforderlich.', 400);

    const updated = await db.prepare(
      `UPDATE announcements SET
         title = ?, body = ?, date = ?, expires = ?, classes = ?, highlight = ?,
         updated_at = datetime('now')
       WHERE id = ?
       RETURNING *`
    ).bind(
      title,
      (body.body ?? '').trim(),
      date,
      (body.expires ?? '').trim() || null,
      (body.classes ?? '').trim(),
      body.highlight ? 1 : 0,
      id,
    ).first<Announcement>();

    if (!updated) return errorResponse('Ankündigung nicht gefunden.', 404);

    await logAudit(db, auth.userId, 'update', 'announcement', id, `Ankündigung bearbeitet: ${title}`);

    return jsonResponse(updated);
  });
}

/** DELETE /api/admin/announcements/:id */
export async function DELETE(_request: Request, { params }: Params): Promise<Response> {
  const { id } = await params;

  return withAdmin('DELETE /api/admin/announcements/:id', async ({ db, auth }) => {
    const existing = await db.prepare(
      'SELECT title FROM announcements WHERE id = ?'
    ).bind(id).first<{ title: string }>();

    if (!existing) return errorResponse('Ankündigung nicht gefunden.', 404);

    await db.prepare('DELETE FROM announcements WHERE id = ?').bind(id).run();
    await logAudit(db, auth.userId, 'delete', 'announcement', id, `Ankündigung gelöscht: ${existing.title}`);

    return jsonResponse({ ok: true, deleted: id });
  });
}
