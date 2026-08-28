import { withAdmin } from '@/server/guard';
import { errorResponse, jsonResponse } from '@/server/responses';
import { logAudit } from '@/server/services/audit';
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
 * Multipart mit zwei Feldern:
 *   `file`     — das Original-PDF (wird in R2 archiviert)
 *   `schedule` — der im Admin-Browser geparste Stundenplan als JSON
 *
 * Der Server parst kein PDF mehr (CPU-Limit des Workers-Free-Plans), prüft die
 * gelieferten Daten aber vollständig, bevor sie nach D1 gehen.
 */
export async function POST(request: Request): Promise<Response> {
  return withAdmin('POST /api/admin/uploads', async ({ env, db, auth }) => {
    const contentType = request.headers.get('Content-Type') ?? '';
    if (!contentType.includes('multipart/form-data')) {
      return errorResponse('Ungültiger Content-Type. Erwartet wird multipart/form-data.', 400);
    }

    let formData: FormData;
    try {
      formData = await request.formData();
    } catch (error) {
      console.error('[uploads] Multipart-Daten konnten nicht gelesen werden:', error);
      return errorResponse('Der Upload konnte nicht gelesen werden. Bitte erneut versuchen.', 400);
    }

    const file = formData.get('file');
    const rawSchedule = formData.get('schedule');

    if (!(file instanceof File)) {
      return errorResponse('Keine PDF-Datei im Upload gefunden.', 400);
    }
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      return errorResponse('Nur PDF-Dateien sind erlaubt.', 400);
    }
    if (file.size > MAX_PDF_SIZE) {
      return errorResponse(`Datei zu groß. Maximum: ${MAX_PDF_SIZE / 1024 / 1024} MB.`, 400);
    }
    if (typeof rawSchedule !== 'string') {
      return errorResponse('Die ausgewerteten Stundenplan-Daten fehlen im Upload.', 400);
    }

    let schedule;
    try {
      schedule = validateSchedule(JSON.parse(rawSchedule));
    } catch (error) {
      if (error instanceof ScheduleValidationError) {
        return errorResponse(error.message, 400);
      }
      return errorResponse('Die Stundenplan-Daten sind kein gültiges JSON.', 400);
    }

    const pdfData = await file.arrayBuffer();
    const header = String.fromCharCode(...new Uint8Array(pdfData.slice(0, 5)));
    if (!header.startsWith('%PDF')) {
      return errorResponse('Die Datei ist kein gültiges PDF.', 400);
    }

    const meta = parseTimetableFilename(file.name);
    const r2Key = buildR2Key(file.name);

    try {
      await env.STORAGE.put(r2Key, pdfData, {
        httpMetadata: { contentType: 'application/pdf' },
        customMetadata: { originalFilename: toAsciiMetadata(file.name) },
      });
    } catch (error) {
      console.error('[uploads] PDF konnte nicht in R2 abgelegt werden:', error);
      return errorResponse('Die PDF-Datei konnte nicht gespeichert werden.', 500);
    }

    let upload: TimetableUpload | null = null;
    try {
      upload = await db.prepare(
        `INSERT INTO timetable_uploads
           (filename, r2_key, file_size, calendar_week, half_year, year_start, year_end_short, status, parse_finished_at, uploaded_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'parsed', datetime('now'), ?)
         RETURNING *`
      ).bind(
        file.name,
        r2Key,
        pdfData.byteLength,
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
      return errorResponse('Der Upload konnte nicht in der Datenbank angelegt werden.', 500);
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
      return errorResponse('Die Stunden konnten nicht gespeichert werden.', 500);
    }

    const summary = summarizeSchedule(schedule);
    await logAudit(
      db, auth.userId, 'upload', 'timetable', upload.id,
      `${file.name}: ${summary.classes} Klassen, ${summary.entries} Stunden`,
    );

    return jsonResponse({ ...upload, ...summary }, 201);
  });
}
