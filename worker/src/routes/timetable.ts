import { Env } from '../types';
import { jsonResponse } from '../router';
import { weekdayForToday } from '../services/berlin-time';
import { loadActiveUpload, buildEntriesByClass, type TimetableEntryRow } from '../services/timetable';

/**
 * GET /api/timetable?klasse=HT11
 * Liefert den aktiven Stundenplan, optional gefiltert nach Klasse.
 */
export async function handleTimetable(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const klasse = url.searchParams.get('klasse');

  const upload = await loadActiveUpload(env);

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

  const rows = await env.DB.prepare(query).bind(...bindings).all<TimetableEntryRow>();

  const { entries } = buildEntriesByClass(rows.results);

  return jsonResponse({
    upload: {
      id: upload.id,
      filename: upload.filename,
      calendar_week: upload.calendar_week,
      half_year: upload.half_year,
      updated_at: upload.updated_at,
    },
    entries,
    classes,
    todayKey: weekdayForToday(),
  });
}

/**
 * GET /api/timetable/classes
 * Listet alle verfügbaren Klassen im aktiven Stundenplan.
 */
export async function handleTimetableClasses(request: Request, env: Env): Promise<Response> {
  const upload = await loadActiveUpload(env);

  if (!upload) {
    return jsonResponse({ classes: [] });
  }

  const rows = await env.DB.prepare(
    'SELECT DISTINCT class_code FROM timetable_entries WHERE upload_id = ? ORDER BY class_code'
  ).bind(upload.id).all<{ class_code: string }>();

  return jsonResponse({ classes: rows.results.map((r) => r.class_code) });
}
