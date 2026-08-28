import { withAdmin } from '@/server/guard';
import { describeError, errorResponse, jsonResponse, readJsonBody } from '@/server/responses';
import { base64ToBytes } from '@/server/services/base64';
import { logAudit } from '@/server/services/audit';
import {
  ALLOWED_IMAGE_TYPES,
  MAX_IMAGE_SIZE,
  TV_SLIDESHOW_CATEGORY,
  detectImageType,
  loadSlideshowImages,
} from '@/server/services/media';
import { MediaFile } from '@/server/types';
import { toAsciiMetadata } from '@/server/services/upload-naming';

export const dynamic = 'force-dynamic';

/** GET /api/admin/media — Bilder der TV-Slideshow. */
export async function GET(): Promise<Response> {
  return withAdmin('GET /api/admin/media', async ({ db }) => {
    return jsonResponse({ media: await loadSlideshowImages(db) });
  });
}

/**
 * POST /api/admin/media — Bild hochladen.
 *
 * JSON-Body mit `filename` und `dataBase64`. Wie beim Stundenplan-Upload
 * bewusst kein Multipart: `request.formData()` scheiterte im Worker
 * reproduzierbar auf iOS.
 */
interface MediaPayload {
  filename?: unknown;
  dataBase64?: unknown;
}

export async function POST(request: Request): Promise<Response> {
  return withAdmin('POST /api/admin/media', async ({ env, db, auth }) => {
    const payload = await readJsonBody<MediaPayload>(request);
    if (!payload) {
      return errorResponse('Der Upload konnte nicht gelesen werden. Bitte erneut versuchen.', 400);
    }

    const filename = typeof payload.filename === 'string' ? payload.filename.trim() : '';
    if (!filename) {
      return errorResponse('Der Dateiname fehlt im Upload.', 400);
    }
    if (typeof payload.dataBase64 !== 'string' || !payload.dataBase64) {
      return errorResponse('Keine Datei im Upload gefunden.', 400);
    }

    let data: Uint8Array;
    try {
      data = base64ToBytes(payload.dataBase64);
    } catch (error) {
      console.error('[media] Base64-Daten konnten nicht dekodiert werden:', error);
      return errorResponse('Das Bild konnte nicht gelesen werden. Bitte erneut versuchen.', 400);
    }

    if (data.byteLength > MAX_IMAGE_SIZE) {
      return errorResponse(`Bild zu groß. Maximum: ${MAX_IMAGE_SIZE / 1024 / 1024} MB.`, 400);
    }

    const imageType = detectImageType(data);
    if (!imageType) {
      return errorResponse(
        `Nicht unterstütztes Format. Erlaubt sind: ${ALLOWED_IMAGE_TYPES.join(', ')}.`,
        400,
      );
    }

    const r2Key = `media/${Date.now()}_${crypto.randomUUID()}.${imageType.extension}`;

    try {
      await env.STORAGE.put(r2Key, data, {
        httpMetadata: { contentType: imageType.contentType },
        customMetadata: { originalFilename: toAsciiMetadata(filename) },
      });
    } catch (error) {
      console.error('[media] Bild konnte nicht in R2 abgelegt werden:', error);
      return errorResponse('Das Bild konnte nicht gespeichert werden.', 500, describeError(error));
    }

    const created = await db.prepare(
      `INSERT INTO media_files (filename, r2_key, content_type, file_size, category, uploaded_by)
       VALUES (?, ?, ?, ?, ?, ?)
       RETURNING *`
    ).bind(
      filename,
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

    await logAudit(db, auth.userId, 'upload', 'media', created.id, `Bild hochgeladen: ${filename}`);

    return jsonResponse(created, 201);
  });
}
