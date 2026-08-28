import { getEnv } from '@/server/env';
import { errorResponse, withErrorHandling } from '@/server/responses';
import { loadMediaFile } from '@/server/services/media';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ id: string }> };

/**
 * GET /api/media/:id — liefert ein hochgeladenes Bild aus R2 aus.
 *
 * Der Bucket bleibt privat; ausgeliefert wird nur, was in `media_files` steht.
 * Die ID ist unveränderlich mit genau einem R2-Objekt verknüpft, deshalb darf
 * die Antwort dauerhaft gecacht werden — wichtig für den TV-Dauerbetrieb.
 */
export async function GET(request: Request, { params }: Params): Promise<Response> {
  const { id } = await params;

  return withErrorHandling('GET /api/media/:id', async () => {
    const env = await getEnv();
    const media = await loadMediaFile(env.DB, id);
    if (!media) return errorResponse('Bild nicht gefunden.', 404);

    const object = await env.STORAGE.get(media.r2_key);
    if (!object) return errorResponse('Bilddatei nicht gefunden.', 404);

    const etag = `"${object.httpEtag.replace(/"/g, '')}"`;
    if (request.headers.get('If-None-Match') === etag) {
      return new Response(null, { status: 304, headers: { ETag: etag } });
    }

    return new Response(object.body, {
      headers: {
        'Content-Type': media.content_type,
        'Content-Length': String(media.file_size),
        'Cache-Control': 'public, max-age=31536000, immutable',
        ETag: etag,
      },
    });
  });
}
