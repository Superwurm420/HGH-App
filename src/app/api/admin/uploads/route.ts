import { withAdmin } from '@/server/guard';
import { describeError, errorResponse, jsonResponse, readJsonBody } from '@/server/responses';
import { logAudit } from '@/server/services/audit';
import { activateUpload, isAutoActivateEnabled } from '@/server/services/activation';
import { base64ToBytes } from '@/server/services/base64';
import {
  ScheduleValidationError,
  storeSchedule,
  summarizeSchedule,
  validateSchedule,
} from '@/server/services/schedule';
import { TimetableUpload } from '@/server/types';
import { parseTimetableFilename } from '@/lib/timetable/parse-pdf';
import { buildR2Key, normalizeHalfYear, toAsciiMetadata } from '@/server/services/upload-naming';

export const dynamic = 'force-dynamic';

const MAX_PDF_SIZE = 20 * 1024 * 1024;

/** GET /api/admin/uploads — alle Uploads, neueste zuerst. */
export async function GET(): Promise<Response> {
  return withAdmin('GET /api/admin/uploads', async ({ db }) => {
    const rows = await db.prepare(
      `SELECT u.*,
              (SELECT COUNT(*) FROM timetable_entries e WHERE e.upload_id = u.id) AS entry_count,
              (SELECT COUNT(DISTINCT e.class_code) FROM timetable_entries e WHERE e.upload_id = u.id) AS class_count
       FROM timetable_uploads u
       ORDER BY u.created_at DESC`
    ).all<TimetableUpload & { entry_count: number; class_count: number }>();

    return jsonResponse({ uploads: rows.results });
  });
}

/**
 * POST /api/admin/uploads
 *
 * JSON-Body mit drei Feldern:
 *   `filename`   — der Original-Dateiname (liefert KW/Halbjahr/Schuljahr)
 *   `dataBase64` — das PDF, Base64-kodiert (wird in R2 archiviert)
 *   `schedule`   — der im Admin-Browser geparste Stundenplan
 *
 * Bewusst JSON und kein Multipart: `request.formData()` scheiterte im Worker
 * reproduzierbar auf iOS, während der JSON-Weg — den alle anderen Admin-Routen
 * ohnehin benutzen — zuverlässig durchkommt.
 *
 * Der Server parst kein PDF (CPU-Limit des Workers-Free-Plans), prüft die
 * gelieferten Daten aber vollständig, bevor sie nach D1 gehen.
 */
interface UploadPayload {
  filename?: unknown;
  dataBase64?: unknown;
  schedule?: unknown;
}

export async function POST(request: Request): Promise<Response> {
  return withAdmin('POST /api/admin/uploads', async ({ env, db, auth }) => {
    const payload = await readJsonBody<UploadPayload>(request);
    if (!payload) {
      return errorResponse('Der Upload konnte nicht gelesen werden. Bitte erneut versuchen.', 400);
    }

    const filename = typeof payload.filename === 'string' ? payload.filename.trim() : '';
    if (!filename) {
      return errorResponse('Der Dateiname fehlt im Upload.', 400);
    }
    if (!filename.toLowerCase().endsWith('.pdf')) {
      return errorResponse('Nur PDF-Dateien sind erlaubt.', 400);
    }
    if (typeof payload.dataBase64 !== 'string' || !payload.dataBase64) {
      return errorResponse('Die PDF-Datei fehlt im Upload.', 400);
    }

    let pdfBytes: Uint8Array;
    try {
      pdfBytes = base64ToBytes(payload.dataBase64);
    } catch (error) {
      console.error('[uploads] Base64-Daten konnten nicht dekodiert werden:', error);
      return errorResponse('Die PDF-Datei konnte nicht gelesen werden. Bitte erneut versuchen.', 400);
    }

    if (pdfBytes.byteLength > MAX_PDF_SIZE) {
      return errorResponse(`Datei zu groß. Maximum: ${MAX_PDF_SIZE / 1024 / 1024} MB.`, 400);
    }

    let schedule;
    try {
      schedule = validateSchedule(payload.schedule);
    } catch (error) {
      if (error instanceof ScheduleValidationError) {
        return errorResponse(error.message, 400);
      }
      return errorResponse('Die Stundenplan-Daten sind ungültig.', 400, describeError(error));
    }

    const header = String.fromCharCode(...pdfBytes.subarray(0, 5));
    if (!header.startsWith('%PDF')) {
      return errorResponse('Die Datei ist kein gültiges PDF.', 400);
    }

    const meta = parseTimetableFilename(filename);
    const r2Key = buildR2Key(filename);

    try {
      await env.STORAGE.put(r2Key, pdfBytes, {
        httpMetadata: { contentType: 'application/pdf' },
        customMetadata: { originalFilename: toAsciiMetadata(filename) },
      });
    } catch (error) {
      console.error('[uploads] PDF konnte nicht in R2 abgelegt werden:', error);
      return errorResponse('Die PDF-Datei konnte nicht gespeichert werden.', 500, describeError(error));
    }

    let upload: TimetableUpload | null = null;
    try {
      upload = await db.prepare(
        `INSERT INTO timetable_uploads
           (filename, r2_key, file_size, calendar_week, half_year, year_start, year_end_short, status, parse_finished_at, uploaded_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'parsed', datetime('now'), ?)
         RETURNING *`
      ).bind(
        filename,
        r2Key,
        pdfBytes.byteLength,
        meta?.kw ?? null,
        normalizeHalfYear(meta?.halfYear),
        meta?.yearStart ?? null,
        meta?.yearEndShort ?? null,
        auth.userId,
      ).first<TimetableUpload>();
    } catch (error) {
      console.error('[uploads] INSERT in timetable_uploads fehlgeschlagen:', error);
      // R2-Objekt nicht verwaisen lassen, wenn der DB-Insert scheitert.
      await env.STORAGE.delete(r2Key).catch(() => undefined);
      return errorResponse(
        'Der Upload konnte nicht in der Datenbank angelegt werden.', 500, describeError(error),
      );
    }

    if (!upload) {
      await env.STORAGE.delete(r2Key).catch(() => undefined);
      return errorResponse('Upload konnte nicht gespeichert werden.', 500);
    }

    try {
      await storeSchedule(db, upload.id, schedule);
    } catch (error) {
      console.error('[uploads] Speichern der Stunden fehlgeschlagen:', error);
      await db.prepare(
        `UPDATE timetable_uploads
         SET status = 'error', parse_error = ?, updated_at = datetime('now')
         WHERE id = ?`
      ).bind('Die Stunden konnten nicht gespeichert werden.', upload.id).run();
      return errorResponse('Die Stunden konnten nicht gespeichert werden.', 500, describeError(error));
    }

    const summary = summarizeSchedule(schedule);
    await logAudit(
      db, auth.userId, 'upload', 'timetable', upload.id,
      `${filename}: ${summary.classes} Klassen, ${summary.entries} Stunden`,
    );

    // Automatik: Der frisch hochgeladene Plan ist immer der neueste, also wird
    // er direkt aktiv. Scheitert das, bleibt der Upload trotzdem bestehen — er
    // lässt sich dann von Hand aktivieren, und ein 500 nach erfolgreichem
    // Upload wäre schlicht irreführend.
    let activated = false;
    if (await isAutoActivateEnabled(db)) {
      try {
        await activateUpload(db, upload, auth.userId);
        activated = true;
      } catch (error) {
        console.error('[uploads] Automatische Aktivierung fehlgeschlagen:', error);
      }
    }

    return jsonResponse({ ...upload, ...summary, activated }, 201);
  });
}
