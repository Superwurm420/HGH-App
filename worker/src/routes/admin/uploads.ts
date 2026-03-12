import { Env, TimetableUpload, Weekday } from '../../types';
import { jsonResponse, errorResponse } from '../../router';
import { logAudit } from '../../services/audit';
import { requireAuth } from '../../middleware/auth';
import { parseTimetableFilename } from '../../pdf-parser/index';

const MAX_PDF_SIZE = 20 * 1024 * 1024; // 20 MB
const ALLOWED_TYPES = ['application/pdf'];

/**
 * GET /api/admin/uploads - Alle Uploads auflisten
 * POST /api/admin/uploads - Neuen PDF-Upload + Parsing starten
 */
export async function handleAdminUploads(request: Request, env: Env): Promise<Response> {
  const auth = await requireAuth(request, env);
  if (auth instanceof Response) return auth;

  if (request.method === 'GET') {
    const rows = await env.DB.prepare(
      'SELECT * FROM timetable_uploads ORDER BY created_at DESC'
    ).all<TimetableUpload>();
    return jsonResponse({ uploads: rows.results });
  }

  if (request.method === 'POST') {
    // Multipart-Upload oder direkt PDF
    const contentType = request.headers.get('Content-Type') ?? '';
    let filename: string;
    let pdfData: ArrayBuffer;

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file');
      if (!file || !(file instanceof File)) {
        return errorResponse('Keine Datei im Upload gefunden.', 400);
      }
      filename = file.name;
      if (!filename.toLowerCase().endsWith('.pdf')) {
        return errorResponse('Nur PDF-Dateien sind erlaubt.', 400);
      }
      if (file.size > MAX_PDF_SIZE) {
        return errorResponse(`Datei zu groß. Maximum: ${MAX_PDF_SIZE / 1024 / 1024} MB.`, 400);
      }
      pdfData = await file.arrayBuffer();
    } else if (ALLOWED_TYPES.includes(contentType)) {
      filename = request.headers.get('X-Filename') ?? `upload_${Date.now()}.pdf`;
      pdfData = await request.arrayBuffer();
      if (pdfData.byteLength > MAX_PDF_SIZE) {
        return errorResponse(`Datei zu groß. Maximum: ${MAX_PDF_SIZE / 1024 / 1024} MB.`, 400);
      }
    } else {
      return errorResponse('Ungültiger Content-Type. PDF erwartet.', 400);
    }

    // PDF-Header prüfen
    const header = new Uint8Array(pdfData.slice(0, 5));
    const headerStr = String.fromCharCode(...header);
    if (!headerStr.startsWith('%PDF')) {
      return errorResponse('Datei ist keine gültige PDF.', 400);
    }

    // Metadaten aus Dateiname extrahieren
    const meta = parseTimetableFilename(filename);

    // In R2 speichern
    const r2Key = `timetables/${Date.now()}_${filename}`;
    await env.STORAGE.put(r2Key, pdfData, {
      httpMetadata: { contentType: 'application/pdf' },
      customMetadata: { originalFilename: filename },
    });

    // Upload-Eintrag in D1
    const upload = await env.DB.prepare(
      `INSERT INTO timetable_uploads (filename, r2_key, file_size, calendar_week, half_year, year_start, year_end_short, status, uploaded_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'uploaded', ?)
       RETURNING *`
    ).bind(
      filename,
      r2Key,
      pdfData.byteLength,
      meta?.kw ?? null,
      meta?.halfYear ?? null,
      meta?.yearStart ?? null,
      meta?.yearEndShort ?? null,
      auth.userId,
    ).first<TimetableUpload>();

    await logAudit(env, auth.userId, 'upload', 'timetable', upload?.id, `PDF hochgeladen: ${filename}`);

    // Parsing sofort starten (im gleichen Request)
    if (upload) {
      try {
        await parseTimetableUpload(env, upload.id, pdfData);
      } catch (error) {
        console.error('[upload] Parsing fehlgeschlagen:', error);
        // Status wird in parseTimetableUpload gesetzt
      }

      // Aktuellen Status laden
      const updated = await env.DB.prepare(
        'SELECT * FROM timetable_uploads WHERE id = ?'
      ).bind(upload.id).first<TimetableUpload>();

      return jsonResponse(updated, 201);
    }

    return jsonResponse(upload, 201);
  }

  return errorResponse('Methode nicht erlaubt.', 405);
}

/**
 * GET /api/admin/uploads/:id - Upload-Details
 * DELETE /api/admin/uploads/:id - Upload löschen
 */
export async function handleAdminUploadById(request: Request, env: Env, id: string): Promise<Response> {
  const auth = await requireAuth(request, env);
  if (auth instanceof Response) return auth;

  if (request.method === 'GET') {
    const upload = await env.DB.prepare(
      'SELECT * FROM timetable_uploads WHERE id = ?'
    ).bind(id).first<TimetableUpload>();

    if (!upload) {
      return errorResponse('Upload nicht gefunden.', 404);
    }

    // Anzahl der geparsten Entries
    const entryCount = await env.DB.prepare(
      'SELECT COUNT(*) as cnt FROM timetable_entries WHERE upload_id = ?'
    ).bind(id).first<{ cnt: number }>();

    const classCount = await env.DB.prepare(
      'SELECT COUNT(DISTINCT class_code) as cnt FROM timetable_entries WHERE upload_id = ?'
    ).bind(id).first<{ cnt: number }>();

    return jsonResponse({
      ...upload,
      entry_count: entryCount?.cnt ?? 0,
      class_count: classCount?.cnt ?? 0,
    });
  }

  if (request.method === 'DELETE') {
    const upload = await env.DB.prepare(
      'SELECT * FROM timetable_uploads WHERE id = ?'
    ).bind(id).first<TimetableUpload>();

    if (!upload) {
      return errorResponse('Upload nicht gefunden.', 404);
    }

    if (upload.status === 'active') {
      return errorResponse('Aktiver Stundenplan kann nicht gelöscht werden. Zuerst einen anderen aktivieren.', 400);
    }

    // R2-Datei löschen
    try {
      await env.STORAGE.delete(upload.r2_key);
    } catch (error) {
      console.warn('[upload] R2-Löschung fehlgeschlagen:', error);
    }

    // Entries und Upload löschen (CASCADE)
    await env.DB.prepare('DELETE FROM timetable_uploads WHERE id = ?').bind(id).run();

    await logAudit(env, auth.userId, 'delete', 'timetable', id, `Upload gelöscht: ${upload.filename}`);

    return jsonResponse({ ok: true, deleted: id });
  }

  return errorResponse('Methode nicht erlaubt.', 405);
}

/**
 * POST /api/admin/uploads/:id/activate
 * Setzt den Upload als aktiven Stundenplan.
 */
export async function handleAdminUploadActivate(request: Request, env: Env, id: string): Promise<Response> {
  const auth = await requireAuth(request, env);
  if (auth instanceof Response) return auth;

  const upload = await env.DB.prepare(
    'SELECT * FROM timetable_uploads WHERE id = ?'
  ).bind(id).first<TimetableUpload>();

  if (!upload) {
    return errorResponse('Upload nicht gefunden.', 404);
  }

  if (upload.status !== 'parsed') {
    return errorResponse(`Upload kann nicht aktiviert werden (Status: ${upload.status}). Nur erfolgreich geparste Uploads sind aktivierbar.`, 400);
  }

  // Atomar: bisherigen archivieren, neuen aktivieren, Setting aktualisieren
  await env.DB.batch([
    env.DB.prepare(
      "UPDATE timetable_uploads SET status = 'archived', updated_at = datetime('now') WHERE status = 'active'"
    ),
    env.DB.prepare(
      "UPDATE timetable_uploads SET status = 'active', updated_at = datetime('now') WHERE id = ?"
    ).bind(id),
    env.DB.prepare(
      "INSERT OR REPLACE INTO app_settings (key, value, updated_at, updated_by) VALUES ('active_timetable_id', ?, datetime('now'), ?)"
    ).bind(id, auth.userId),
  ]);

  await logAudit(env, auth.userId, 'activate', 'timetable', id, `Stundenplan aktiviert: ${upload.filename}`);

  return jsonResponse({ ok: true, activated: id });
}

/**
 * Parst ein hochgeladenes PDF und speichert die Entries in D1.
 */
async function parseTimetableUpload(env: Env, uploadId: string, pdfData: ArrayBuffer): Promise<void> {
  // Status auf 'parsing' setzen
  await env.DB.prepare(
    "UPDATE timetable_uploads SET status = 'parsing', parse_started_at = datetime('now'), updated_at = datetime('now') WHERE id = ?"
  ).bind(uploadId).run();

  try {
    // PDF parsen – wir importieren pdfjs-dist dynamisch
    const { parseTimetablePdf } = await import('../../pdf-parser/index');

    // pdfjs-dist muss als Dependency verfügbar sein
    let pdfjsLib: { getDocument: unknown; VerbosityLevel?: { ERRORS?: number } };
    try {
      pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
    } catch {
      try {
        pdfjsLib = await import('pdfjs-dist');
      } catch {
        throw new Error('pdfjs-dist ist nicht verfügbar.');
      }
    }

    const schedule = await parseTimetablePdf(
      pdfData,
      pdfjsLib.getDocument as Parameters<typeof parseTimetablePdf>[1],
      pdfjsLib.VerbosityLevel?.ERRORS ?? 0,
    );

    // Alte Entries löschen (falls Re-Parse)
    await env.DB.prepare(
      'DELETE FROM timetable_entries WHERE upload_id = ?'
    ).bind(uploadId).run();

    // Neue Entries einfügen (Batch)
    const weekdays: Weekday[] = ['MO', 'DI', 'MI', 'DO', 'FR'];
    const statements: D1PreparedStatement[] = [];

    for (const [classCode, weekPlan] of Object.entries(schedule)) {
      for (const day of weekdays) {
        const lessons = weekPlan[day] ?? [];
        for (const lesson of lessons) {
          statements.push(
            env.DB.prepare(
              `INSERT INTO timetable_entries (upload_id, class_code, weekday, period, period_end, time_range, subject, detail, room)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
            ).bind(
              uploadId,
              classCode,
              day,
              lesson.period,
              lesson.periodEnd ?? null,
              lesson.time,
              lesson.subject ?? null,
              lesson.detail ?? null,
              lesson.room ?? null,
            )
          );
        }
      }

      // Klasse in classes-Tabelle anlegen falls nicht vorhanden
      statements.push(
        env.DB.prepare(
          'INSERT OR IGNORE INTO classes (code) VALUES (?)'
        ).bind(classCode)
      );
    }

    // D1 batch (max 100 statements per batch)
    const BATCH_SIZE = 100;
    for (let i = 0; i < statements.length; i += BATCH_SIZE) {
      const batch = statements.slice(i, i + BATCH_SIZE);
      await env.DB.batch(batch);
    }

    // Status auf 'parsed' setzen
    const classCount = Object.keys(schedule).length;
    const entryCount = Object.values(schedule).reduce(
      (sum, wp) => sum + weekdays.reduce((s, d) => s + (wp[d]?.length ?? 0), 0),
      0,
    );

    await env.DB.prepare(
      `UPDATE timetable_uploads SET
         status = 'parsed',
         parse_finished_at = datetime('now'),
         parse_error = NULL,
         updated_at = datetime('now')
       WHERE id = ?`
    ).bind(uploadId).run();

    console.log(`[parser] Upload ${uploadId}: ${classCount} Klassen, ${entryCount} Einträge geparst.`);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unbekannter Parsing-Fehler';
    console.error(`[parser] Upload ${uploadId} fehlgeschlagen:`, errorMessage);

    await env.DB.prepare(
      `UPDATE timetable_uploads SET
         status = 'error',
         parse_error = ?,
         parse_finished_at = datetime('now'),
         updated_at = datetime('now')
       WHERE id = ?`
    ).bind(errorMessage, uploadId).run();
  }
}
