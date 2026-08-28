import { LessonEntry, TimetableUpload, Weekday, WeekPlan, WEEKDAYS } from '../types';

/** Zeile aus timetable_entries. */
export interface TimetableEntryRow {
  class_code: string;
  weekday: Weekday;
  period: number;
  period_end: number | null;
  time_range: string;
  subject: string | null;
  detail: string | null;
  room: string | null;
}

/** Der Stundenplan, wie ihn Seiten und API ausliefern. */
export interface TimetableView {
  upload: Pick<TimetableUpload, 'id' | 'filename' | 'calendar_week' | 'half_year' | 'updated_at'> | null;
  entries: Record<string, WeekPlan>;
  classes: string[];
  todayKey: Weekday;
}

function emptyWeek(): WeekPlan {
  return { MO: [], DI: [], MI: [], DO: [], FR: [] };
}

/**
 * Lädt den aktiven Stundenplan-Upload.
 *
 * Fällt auf den zuletzt geparsten bzw. archivierten Plan zurück, damit die App
 * auch dann etwas anzeigt, wenn nach einem Upload das Aktivieren vergessen wurde.
 */
export async function loadActiveUpload(db: D1Database): Promise<TimetableUpload | null> {
  const activeSetting = await db.prepare(
    "SELECT value FROM app_settings WHERE key = 'active_timetable_id'"
  ).first<{ value: string }>();

  if (activeSetting?.value) {
    const upload = await db.prepare(
      "SELECT * FROM timetable_uploads WHERE id = ? AND status = 'active'"
    ).bind(activeSetting.value).first<TimetableUpload>();
    if (upload) return upload;
  }

  return db.prepare(
    `SELECT * FROM timetable_uploads
     WHERE status IN ('active', 'parsed', 'archived')
     ORDER BY
       CASE status WHEN 'active' THEN 0 WHEN 'parsed' THEN 1 ELSE 2 END,
       updated_at DESC
     LIMIT 1`
  ).first<TimetableUpload>();
}

/** Gruppiert DB-Zeilen nach Klasse und Wochentag. */
export function buildEntriesByClass(rows: TimetableEntryRow[]): {
  entries: Record<string, WeekPlan>;
  classes: string[];
} {
  const entries: Record<string, WeekPlan> = {};

  for (const row of rows) {
    if (!WEEKDAYS.includes(row.weekday)) continue;
    if (!entries[row.class_code]) {
      entries[row.class_code] = emptyWeek();
    }
    const lesson: LessonEntry = {
      period: row.period,
      time: row.time_range,
    };
    if (row.period_end !== null) lesson.periodEnd = row.period_end;
    if (row.subject) lesson.subject = row.subject;
    if (row.detail) lesson.detail = row.detail;
    if (row.room) lesson.room = row.room;

    entries[row.class_code][row.weekday].push(lesson);
  }

  return { entries, classes: Object.keys(entries).sort() };
}

/**
 * Lädt den kompletten aktiven Stundenplan.
 *
 * Wird sowohl von `GET /api/timetable` als auch direkt von den Server Components
 * genutzt — die Seiten rufen dafür also keine HTTP-API mehr auf.
 */
export async function loadTimetable(
  db: D1Database,
  todayKey: Weekday,
  klasse?: string | null,
): Promise<TimetableView> {
  const upload = await loadActiveUpload(db);

  if (!upload) {
    return { upload: null, entries: {}, classes: [], todayKey };
  }

  const classRows = await db.prepare(
    'SELECT DISTINCT class_code FROM timetable_entries WHERE upload_id = ? ORDER BY class_code'
  ).bind(upload.id).all<{ class_code: string }>();

  const classes = classRows.results.map((row) => row.class_code);

  const filterByClass = Boolean(klasse && classes.includes(klasse));
  const query = filterByClass
    ? 'SELECT * FROM timetable_entries WHERE upload_id = ? AND class_code = ? ORDER BY class_code, weekday, period'
    : 'SELECT * FROM timetable_entries WHERE upload_id = ? ORDER BY class_code, weekday, period';

  const rows = filterByClass
    ? await db.prepare(query).bind(upload.id, klasse).all<TimetableEntryRow>()
    : await db.prepare(query).bind(upload.id).all<TimetableEntryRow>();

  const { entries } = buildEntriesByClass(rows.results);

  return {
    upload: {
      id: upload.id,
      filename: upload.filename,
      calendar_week: upload.calendar_week,
      half_year: upload.half_year,
      updated_at: upload.updated_at,
    },
    entries,
    classes,
    todayKey,
  };
}

/** Alle Klassen des aktiven Stundenplans. */
export async function loadClasses(db: D1Database): Promise<string[]> {
  const upload = await loadActiveUpload(db);
  if (!upload) return [];

  const rows = await db.prepare(
    'SELECT DISTINCT class_code FROM timetable_entries WHERE upload_id = ? ORDER BY class_code'
  ).bind(upload.id).all<{ class_code: string }>();

  return rows.results.map((row) => row.class_code);
}
