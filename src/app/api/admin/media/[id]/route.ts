import { withAdmin } from '@/server/guard';
import { errorResponse, jsonResponse } from '@/server/responses';
import { logAudit } from '@/server/services/audit';
import { loadMediaFile } from '@/server/services/media';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ id: string }> };

/** DELETE /api/admin/media/:id — Bild aus R2 und Datenbank entfernen. */
export async function DELETE(_request: Request, { params }: Params): Promise<Response> {
  const { id } = await params;

  return withAdmin('DELETE /api/admin/media/:id', async ({ env, db, auth }) => {
    const media = await loadMediaFile(db, id);
    if (!media) return errorResponse('Bild nicht gefunden.', 404);

    try {
      await env.STORAGE.delete(media.r2_key);
    } catch (error) {
      console.warn('[media] Datei konnte nicht aus R2 gelöscht werden:', error);
    }

    await db.prepare('DELETE FROM media_files WHERE id = ?').bind(id).run();
    await logAudit(db, auth.userId, 'delete', 'media', id, `Bild gelöscht: ${media.filename}`);

    return jsonResponse({ ok: true, deleted: id });
  });
}
