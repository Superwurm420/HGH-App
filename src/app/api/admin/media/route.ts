import { withAdmin } from '@/server/guard';
import { errorResponse, jsonResponse } from '@/server/responses';
import { logAudit } from '@/server/services/audit';
import {
  ALLOWED_IMAGE_TYPES,
  MAX_IMAGE_SIZE,
  TV_SLIDESHOW_CATEGORY,
  detectImageType,
  loadSlideshowImages,
} from '@/server/services/media';
import { MediaFile } from '@/server/types';

export const dynamic = 'force-dynamic';

/** GET /api/admin/media — Bilder der TV-Slideshow. */
export async function GET(): Promise<Response> {
  return withAdmin('GET /api/admin/media', async ({ db }) => {
    return jsonResponse({ media: await loadSlideshowImages(db) });
  });
}

/** POST /api/admin/media — Bild hochladen (multipart, Feld `file`). */
export async function POST(request: Request): Promise<Response> {
  return withAdmin('POST /api/admin/media', async ({ env, db, auth }) => {
    const contentType = request.headers.get('Content-Type') ?? '';
    if (!contentType.includes('multipart/form-data')) {
      return errorResponse('Ungültiger Content-Type. Erwartet wird multipart/form-data.', 400);
    }

    const formData = await request.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return errorResponse('Keine Datei im Upload gefunden.', 400);
    }
    if (file.size > MAX_IMAGE_SIZE) {
      return errorResponse(`Bild zu groß. Maximum: ${MAX_IMAGE_SIZE / 1024 / 1024} MB.`, 400);
    }

    const data = await file.arrayBuffer();
    const imageType = detectImageType(data);
    if (!imageType) {
      return errorResponse(
        `Nicht unterstütztes Format. Erlaubt sind: ${ALLOWED_IMAGE_TYPES.join(', ')}.`,
        400,
      );
    }

    const r2Key = `media/${Date.now()}_${crypto.randomUUID()}.${imageType.extension}`;

    await env.STORAGE.put(r2Key, data, {
      httpMetadata: { contentType: imageType.contentType },
      customMetadata: { originalFilename: file.name },
    });

    const created = await db.prepare(
      `INSERT INTO media_files (filename, r2_key, content_type, file_size, category, uploaded_by)
       VALUES (?, ?, ?, ?, ?, ?)
       RETURNING *`
    ).bind(
      file.name,
      r2Key,
      imageType.contentType,
      data.byteLength,
      TV_SLIDESHOW_CATEGORY,
      auth.userId,
    ).first<MediaFile>();

    if (!created) {
      await env.STORAGE.delete(r2Key).catch(() => undefined);
      return errorResponse('Bild konnte nicht gespeichert werden.', 500);
    }

    await logAudit(db, auth.userId, 'upload', 'media', created.id, `Bild hochgeladen: ${file.name}`);

    return jsonResponse(created, 201);
  });
}
