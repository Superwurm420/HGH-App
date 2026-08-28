import { withAdmin } from '@/server/guard';
import { errorResponse, jsonResponse } from '@/server/responses';
import { logAudit } from '@/server/services/audit';
import { TimetableUpload } from '@/server/types';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ id: string }> };

/**
 * POST /api/admin/uploads/:id/activate
 *
 * Setzt den Upload als aktiven Stundenplan. Der bisherige wird archiviert und
 * `active_timetable_id` mitgeschrieben — beides in einem batch(), damit nie ein
 * Zustand mit zwei aktiven Plänen entstehen kann.
 */
export async function POST(_request: Request, { params }: Params): Promise<Response> {
  const { id } = await params;

  return withAdmin('POST /api/admin/uploads/:id/activate', async ({ db, auth }) => {
    const upload = await db.prepare(
      'SELECT * FROM timetable_uploads WHERE id = ?'
    ).bind(id).first<TimetableUpload>();

    if (!upload) return errorResponse('Upload nicht gefunden.', 404);

    if (upload.status === 'active') {
      return jsonResponse({ ok: true, activated: id });
    }
    if (upload.status !== 'parsed' && upload.status !== 'archived') {
      return errorResponse(
        `Dieser Upload kann nicht aktiviert werden (Status: ${upload.status}).`,
        400,
      );
    }

    const entryCount = await db.prepare(
      'SELECT COUNT(*) AS cnt FROM timetable_entries WHERE upload_id = ?'
    ).bind(id).first<{ cnt: number }>();

    if ((entryCount?.cnt ?? 0) === 0) {
      return errorResponse('Dieser Upload enthält keine Stunden und kann nicht aktiviert werden.', 400);
    }

    await db.batch([
      db.prepare(
        "UPDATE timetable_uploads SET status = 'archived', updated_at = datetime('now') WHERE status = 'active'"
      ),
      db.prepare(
        "UPDATE timetable_uploads SET status = 'active', updated_at = datetime('now') WHERE id = ?"
      ).bind(id),
      db.prepare(
        `INSERT INTO app_settings (key, value, updated_at, updated_by)
         VALUES ('active_timetable_id', ?, datetime('now'), ?)
         ON CONFLICT(key) DO UPDATE SET
           value = excluded.value, updated_at = excluded.updated_at, updated_by = excluded.updated_by`
      ).bind(id, auth.userId),
    ]);

    await logAudit(db, auth.userId, 'activate', 'timetable', id, `Stundenplan aktiviert: ${upload.filename}`);

    return jsonResponse({ ok: true, activated: id });
  });
}
