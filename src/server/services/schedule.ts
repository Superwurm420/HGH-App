import { LessonEntry, ParsedSchedule, Weekday, WeekPlan, WEEKDAYS } from '../types';

/**
 * Prüfung des vom Admin-Browser gelieferten Stundenplans.
 *
 * Geparst wird im Browser — vertraut wird ihm deshalb nicht. Alles, was hier
 * durchkommt, landet direkt in D1, also gelten dieselben Grenzen wie im Schema
 * (CHECK auf weekday) plus großzügige Längen- und Mengenlimits.
 */

const CLASS_CODE_PATTERN = /^[A-ZÄÖÜ]{1,5}\d{1,2}[A-Z]?$/;
const MAX_CLASSES = 200;
const MAX_ENTRIES = 20_000;
const MAX_PERIOD = 20;
const MAX_TEXT_LENGTH = 200;

export class ScheduleValidationError extends Error {}

function fail(message: string): never {
  throw new ScheduleValidationError(message);
}

function cleanText(value: unknown, field: string): string | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value !== 'string') fail(`${field} muss Text sein.`);
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (trimmed.length > MAX_TEXT_LENGTH) {
    fail(`${field} ist länger als ${MAX_TEXT_LENGTH} Zeichen.`);
  }
  return trimmed;
}

function cleanPeriod(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isInteger(value)) {
    fail(`${field} muss eine ganze Zahl sein.`);
  }
  if (value < 0 || value > MAX_PERIOD) {
    fail(`${field} muss zwischen 0 und ${MAX_PERIOD} liegen.`);
  }
  return value;
}

function cleanLesson(raw: unknown, where: string): LessonEntry {
  if (typeof raw !== 'object' || raw === null) fail(`${where}: Stunde ist kein Objekt.`);
  const input = raw as Record<string, unknown>;

  const lesson: LessonEntry = {
    period: cleanPeriod(input.period, `${where}: period`),
    time: cleanText(input.time, `${where}: time`) ?? '',
  };

  if (input.periodEnd !== undefined && input.periodEnd !== null) {
    const periodEnd = cleanPeriod(input.periodEnd, `${where}: periodEnd`);
    if (periodEnd < lesson.period) {
      fail(`${where}: periodEnd liegt vor period.`);
    }
    lesson.periodEnd = periodEnd;
  }

  const subject = cleanText(input.subject, `${where}: subject`);
  const detail = cleanText(input.detail, `${where}: detail`);
  const room = cleanText(input.room, `${where}: room`);
  if (subject) lesson.subject = subject;
  if (detail) lesson.detail = detail;
  if (room) lesson.room = room;

  return lesson;
}

/**
 * Validiert und normalisiert einen geparsten Stundenplan.
 * Wirft `ScheduleValidationError` mit einer für die Redaktion lesbaren Meldung.
 */
export function validateSchedule(raw: unknown): ParsedSchedule {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    fail('Stundenplan-Daten fehlen oder haben das falsche Format.');
  }

  const input = raw as Record<string, unknown>;
  const classCodes = Object.keys(input);

  if (classCodes.length === 0) {
    fail('Im PDF wurde keine einzige Klasse erkannt.');
  }
  if (classCodes.length > MAX_CLASSES) {
    fail(`Zu viele Klassen (${classCodes.length}, erlaubt sind ${MAX_CLASSES}).`);
  }

  const schedule: ParsedSchedule = {};
  let entryCount = 0;

  for (const rawCode of classCodes) {
    const classCode = rawCode.trim().toUpperCase();
    if (!CLASS_CODE_PATTERN.test(classCode)) {
      fail(`Ungültiger Klassencode: "${rawCode}".`);
    }

    const rawWeek = input[rawCode];
    if (typeof rawWeek !== 'object' || rawWeek === null) {
      fail(`${classCode}: Wochenplan fehlt.`);
    }

    const week: WeekPlan = { MO: [], DI: [], MI: [], DO: [], FR: [] };

    for (const day of WEEKDAYS) {
      const rawLessons = (rawWeek as Record<string, unknown>)[day];
      if (rawLessons === undefined || rawLessons === null) continue;
      if (!Array.isArray(rawLessons)) {
        fail(`${classCode}/${day}: Stundenliste ist kein Array.`);
      }

      for (const rawLesson of rawLessons) {
        week[day].push(cleanLesson(rawLesson, `${classCode}/${day}`));
        entryCount += 1;
        if (entryCount > MAX_ENTRIES) {
          fail(`Zu viele Stundeneinträge (Maximum ${MAX_ENTRIES}).`);
        }
      }

      week[day].sort((a, b) => a.period - b.period);
    }

    schedule[classCode] = week;
  }

  if (entryCount === 0) {
    fail('Im PDF wurde keine einzige Unterrichtsstunde erkannt.');
  }

  return schedule;
}

/** Zählt Klassen und Stunden — für Statusanzeige und Audit-Log. */
export function summarizeSchedule(schedule: ParsedSchedule): { classes: number; entries: number } {
  let entries = 0;
  for (const week of Object.values(schedule)) {
    for (const day of WEEKDAYS) {
      entries += week[day]?.length ?? 0;
    }
  }
  return { classes: Object.keys(schedule).length, entries };
}

/** D1 erlaubt maximal 100 Statements pro batch(). */
const BATCH_SIZE = 100;

/**
 * Schreibt die Stunden eines Uploads nach D1 und legt neue Klassen an.
 * Vorhandene Einträge des Uploads werden vorher entfernt (Re-Import).
 */
export async function storeSchedule(
  db: D1Database,
  uploadId: string,
  schedule: ParsedSchedule,
): Promise<void> {
  await db.prepare('DELETE FROM timetable_entries WHERE upload_id = ?').bind(uploadId).run();

  const statements: D1PreparedStatement[] = [];

  for (const [classCode, week] of Object.entries(schedule)) {
    statements.push(
      db.prepare('INSERT OR IGNORE INTO classes (code) VALUES (?)').bind(classCode),
    );

    for (const day of WEEKDAYS) {
      for (const lesson of week[day] ?? []) {
        statements.push(
          db.prepare(
            `INSERT INTO timetable_entries
               (upload_id, class_code, weekday, period, period_end, time_range, subject, detail, room)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
          ).bind(
            uploadId,
            classCode,
            day as Weekday,
            lesson.period,
            lesson.periodEnd ?? null,
            lesson.time,
            lesson.subject ?? null,
            lesson.detail ?? null,
            lesson.room ?? null,
          ),
        );
      }
    }
  }

  for (let i = 0; i < statements.length; i += BATCH_SIZE) {
    await db.batch(statements.slice(i, i + BATCH_SIZE));
  }
}
