import { Env, TimetableUpload, LessonEntry, Weekday } from '../types';

/** DB-Zeile aus timetable_entries */
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

/**
 * Lädt den aktiven Stundenplan-Upload mit Fallback auf den letzten geparsten/archivierten.
 */
export async function loadActiveUpload(env: Env): Promise<TimetableUpload | null> {
  const activeSetting = await env.DB.prepare(
    "SELECT value FROM app_settings WHERE key = 'active_timetable_id'"
  ).first<{ value: string }>();

  if (activeSetting?.value) {
    const upload = await env.DB.prepare(
      'SELECT * FROM timetable_uploads WHERE id = ? AND status = ?'
    ).bind(activeSetting.value, 'active').first<TimetableUpload>();
    if (upload) return upload;
  }

  // Fallback: letzten verfügbaren Stundenplan nehmen
  return env.DB.prepare(
    `SELECT * FROM timetable_uploads
     WHERE status IN ('active', 'parsed', 'archived')
     ORDER BY
       CASE status WHEN 'active' THEN 0 WHEN 'parsed' THEN 1 WHEN 'archived' THEN 2 END,
       updated_at DESC
     LIMIT 1`
  ).first<TimetableUpload>();
}

/**
 * Transformiert DB-Zeilen in das entries-by-class Format.
 */
export function buildEntriesByClass(rows: TimetableEntryRow[]): {
  entries: Record<string, Record<Weekday, LessonEntry[]>>;
  classes: string[];
} {
  const entriesByClass: Record<string, Record<Weekday, LessonEntry[]>> = {};
  const classSet = new Set<string>();

  for (const row of rows) {
    classSet.add(row.class_code);
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

  return {
    entries: entriesByClass,
    classes: [...classSet].sort(),
  };
}
