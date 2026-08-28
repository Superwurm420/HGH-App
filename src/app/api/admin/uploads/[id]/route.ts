import { withAdmin } from '@/server/guard';
import { errorResponse, jsonResponse } from '@/server/responses';
import { logAudit } from '@/server/services/audit';
import { TimetableUpload } from '@/server/types';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ id: string }> };

/** GET /api/admin/uploads/:id — Upload mit Anzahl Klassen und Stunden. */
export async function GET(_request: Request, { params }: Params): Promise<Response> {
  const { id } = await params;

  return withAdmin('GET /api/admin/uploads/:id', async ({ db }) => {
    const upload = await db.prepare(
      `SELECT u.*,
              (SELECT COUNT(*) FROM timetable_entries e WHERE e.upload_id = u.id) AS entry_count,
              (SELECT COUNT(DISTINCT e.class_code) FROM timetable_entries e WHERE e.upload_id = u.id) AS class_count
       FROM timetable_uploads u
       WHERE u.id = ?`
    ).bind(id).first<TimetableUpload & { entry_count: number; class_count: number }>();

    if (!upload) return errorResponse('Upload nicht gefunden.', 404);
    return jsonResponse(upload);
  });
}

/** DELETE /api/admin/uploads/:id — Upload samt PDF und Stunden entfernen. */
export async function DELETE(_request: Request, { params }: Params): Promise<Response> {
  const { id } = await params;

  return withAdmin('DELETE /api/admin/uploads/:id', async ({ env, db, auth }) => {
    const upload = await db.prepare(
      'SELECT * FROM timetable_uploads WHERE id = ?'
    ).bind(id).first<TimetableUpload>();

    if (!upload) return errorResponse('Upload nicht gefunden.', 404);
    if (upload.status === 'active') {
      return errorResponse('Der aktive Stundenplan kann nicht gelöscht werden. Aktiviere zuerst einen anderen.', 400);
    }

    try {
      await env.STORAGE.delete(upload.r2_key);
    } catch (error) {
      // Fehlendes R2-Objekt darf das Löschen des Datensatzes nicht blockieren.
      console.warn('[uploads] PDF konnte nicht aus R2 gelöscht werden:', error);
    }

    // timetable_entries hängen per ON DELETE CASCADE am Upload.
    await db.prepare('DELETE FROM timetable_uploads WHERE id = ?').bind(id).run();
    await logAudit(db, auth.userId, 'delete', 'timetable', id, `Upload gelöscht: ${upload.filename}`);

    return jsonResponse({ ok: true, deleted: id });
  });
}
