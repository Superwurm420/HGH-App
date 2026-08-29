import type { LessonEntry } from './types';

export type TimeRange = { start: number; end: number };

/**
 * Zeitangaben aus dem Stundenplan in Minuten seit Mitternacht.
 *
 * Die Schreibweise ist im PDF nicht einheitlich („8.00 - 9.30", „08:00-09:30"),
 * deshalb wird beides zugelassen. Vorher stand diese Auswertung dreimal leicht
 * verschieden im Code — einmal mit `replace('.', ':')`, was „8.00" zwar traf,
 * aber jede zweite Schreibweise still verwarf.
 */
function toMinutes(value: string): number | null {
  const match = value.match(/(\d{1,2})[:.](\d{2})/);
  if (!match) return null;

  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return null;

  return hour * 60 + minute;
}

export function parseLessonTimeRange(time: string): TimeRange | null {
  const parts = time.split('-').map((part) => part.trim());
  if (parts.length < 2) return null;

  const start = toMinutes(parts[0]);
  const end = toMinutes(parts[1]);
  if (start === null || end === null) return null;

  return { start, end };
}

/** Läuft diese Stunde gerade? */
export function isLessonRunning(lesson: LessonEntry, nowMinutes: number): boolean {
  const range = parseLessonTimeRange(lesson.time);
  if (!range) return false;
  return nowMinutes >= range.start && nowMinutes < range.end;
}
