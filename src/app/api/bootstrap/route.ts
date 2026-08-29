import { getDb } from '@/server/env';
import { jsonResponse, withErrorHandling } from '@/server/responses';
import { loadActiveUpload } from '@/server/services/timetable';

export const dynamic = 'force-dynamic';

/**
 * GET /api/bootstrap — Versionsstempel der angezeigten Inhalte.
 *
 * `TimetableAutoRefresh` pollt diesen Endpunkt im Minutentakt und lädt die Seite
 * neu, sobald sich der ETag ändert. Deshalb liefert er bewusst nur den Hash und
 * nicht den kompletten Stundenplan: Bei einem Bildschirm im Dauerbetrieb wären
 * das sonst über 1.400 Volldatenabfragen pro Tag und Gerät.
 *
 * `timetable` ist ein zweiter, engerer Stempel: Er ändert sich nur, wenn ein
 * anderer Stundenplan aktiv wird oder der aktive sich ändert. Nur darauf zeigt
 * die App einen Hinweis — eine bearbeitete Ankündigung ist keine Meldung wert.
 */
export async function GET(request: Request): Promise<Response> {
  return withErrorHandling('GET /api/bootstrap', async () => {
    const db = await getDb();

    const stamp = await db.prepare(
      `SELECT
         (SELECT COALESCE(MAX(updated_at), '') FROM timetable_uploads) AS uploads_at,
         (SELECT COUNT(*) FROM timetable_uploads WHERE status = 'active') AS active_uploads,
         (SELECT COALESCE(MAX(updated_at), '') FROM announcements) AS announcements_at,
         (SELECT COUNT(*) FROM announcements) AS announcements_count,
         (SELECT COALESCE(MAX(updated_at), '') FROM events) AS events_at,
         (SELECT COUNT(*) FROM events) AS events_count,
         (SELECT COALESCE(MAX(updated_at), '') FROM app_settings) AS settings_at,
         (SELECT COALESCE(MAX(created_at), '') FROM media_files) AS media_at,
         (SELECT COUNT(*) FROM media_files) AS media_count`
    ).first<Record<string, string | number>>();

    const version = await hashString(JSON.stringify(stamp ?? {}));
    const etag = `"${version}"`;

    if (request.headers.get('If-None-Match') === etag) {
      return new Response(null, { status: 304, headers: { ETag: etag, 'Cache-Control': 'no-cache' } });
    }

    const activeUpload = await loadActiveUpload(db);
    const timetable = await hashString(
      JSON.stringify(
        activeUpload
          ? {
              id: activeUpload.id,
              updated_at: activeUpload.updated_at,
              calendar_week: activeUpload.calendar_week,
            }
          : {},
      ),
    );

    return jsonResponse({ version, timetable }, 200, { ETag: etag, 'Cache-Control': 'no-cache' });
  });
}

async function hashString(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 16);
}
