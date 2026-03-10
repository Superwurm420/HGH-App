import { Env, TimetableUpload, LessonEntry, Weekday } from '../types';
import { jsonResponse, errorResponse } from '../router';
import { weekdayForToday } from '../services/berlin-time';

/**
 * GET /api/timetable?klasse=HT11
 * Liefert den aktiven Stundenplan, optional gefiltert nach Klasse.
 */
export async function handleTimetable(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const klasse = url.searchParams.get('klasse');

  const activeSetting = await env.DB.prepare(
    "SELECT value FROM app_settings WHERE key = 'active_timetable_id'"
  ).first<{ value: string }>();

  // Aktiven Stundenplan laden, mit Fallback auf letzten geparsten/archivierten
  let upload: TimetableUpload | null = null;

  if (activeSetting?.value) {
    upload = await env.DB.prepare(
      'SELECT * FROM timetable_uploads WHERE id = ? AND status = ?'
    ).bind(activeSetting.value, 'active').first<TimetableUpload>();
  }

  if (!upload) {
    upload = await env.DB.prepare(
      `SELECT * FROM timetable_uploads
       WHERE status IN ('active', 'parsed', 'archived')
       ORDER BY
         CASE status WHEN 'active' THEN 0 WHEN 'parsed' THEN 1 WHEN 'archived' THEN 2 END,
         updated_at DESC
       LIMIT 1`
    ).first<TimetableUpload>();
  }

  if (!upload) {
    return jsonResponse({ upload: null, entries: {}, classes: [], todayKey: weekdayForToday() });
  }

  // Alle Klassen für diesen Upload
  const classRows = await env.DB.prepare(
    'SELECT DISTINCT class_code FROM timetable_entries WHERE upload_id = ? ORDER BY class_code'
  ).bind(upload.id).all<{ class_code: string }>();

  const classes = classRows.results.map((r) => r.class_code);

  // Entries laden
  let query = 'SELECT * FROM timetable_entries WHERE upload_id = ?';
  const bindings: unknown[] = [upload.id];

  if (klasse && classes.includes(klasse)) {
    query += ' AND class_code = ?';
    bindings.push(klasse);
  }

  query += ' ORDER BY class_code, weekday, period';

  const rows = await env.DB.prepare(query).bind(...bindings).all<{
    class_code: string;
    weekday: Weekday;
    period: number;
    period_end: number | null;
    time_range: string;
    subject: string | null;
    detail: string | null;
    room: string | null;
  }>();

  const entriesByClass: Record<string, Record<Weekday, LessonEntry[]>> = {};
  for (const row of rows.results) {
    if (!entriesByClass[row.class_code]) {
      entriesByClass[row.class_code] = { MO: [], DI: [], MI: [], DO: [], FR: [] };
    }
    entriesByClass[row.class_code][row.weekday].push({
      period: row.period,
      periodEnd: row.period_end ?? undefined,
      time: row.time_range,
      subject: row.subject ?? undefined,
      detail: row.detail ?? undefined,
      room: row.room ?? undefined,
    });
  }

  return jsonResponse({
    upload: {
      id: upload.id,
      filename: upload.filename,
      calendar_week: upload.calendar_week,
      half_year: upload.half_year,
      updated_at: upload.updated_at,
    },
    entries: entriesByClass,
    classes,
    todayKey: weekdayForToday(),
  });
}

/**
 * GET /api/timetable/classes
 * Listet alle verfügbaren Klassen im aktiven Stundenplan.
 */
export async function handleTimetableClasses(request: Request, env: Env): Promise<Response> {
  const activeSetting = await env.DB.prepare(
    "SELECT value FROM app_settings WHERE key = 'active_timetable_id'"
  ).first<{ value: string }>();

  let uploadId = activeSetting?.value || null;

  // Fallback: letzten verfügbaren Stundenplan suchen
  if (!uploadId) {
    const fallback = await env.DB.prepare(
      `SELECT id FROM timetable_uploads
       WHERE status IN ('active', 'parsed', 'archived')
       ORDER BY CASE status WHEN 'active' THEN 0 WHEN 'parsed' THEN 1 WHEN 'archived' THEN 2 END,
         updated_at DESC
       LIMIT 1`
    ).first<{ id: string }>();
    uploadId = fallback?.id ?? null;
  }

  if (!uploadId) {
    return jsonResponse({ classes: [] });
  }

  const rows = await env.DB.prepare(
    'SELECT DISTINCT class_code FROM timetable_entries WHERE upload_id = ? ORDER BY class_code'
  ).bind(uploadId).all<{ class_code: string }>();

  return jsonResponse({ classes: rows.results.map((r) => r.class_code) });
}
