import { withAdmin } from '@/server/guard';
import { errorResponse, jsonResponse } from '@/server/responses';
import { activateUpload } from '@/server/services/activation';
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

    await activateUpload(db, upload, auth.userId);

    return jsonResponse({ ok: true, activated: id });
  });
}
