import { parseLessonTimeRange } from './lesson-times';
import type { LessonEntry, ParsedSchedule, Weekday } from './types';

/**
 * Was für eine Klasse gerade ansteht.
 *
 * `current` ist die laufende Stunde, `next` die darauf folgende. Beides kann
 * `null` sein: vor Unterrichtsbeginn gibt es nur ein `next`, in der letzten
 * Stunde nur ein `current`, nach Schulschluss keines von beidem.
 */
export type ClassLessonState = {
  schoolClass: string;
  current: LessonEntry | null;
  next: LessonEntry | null;
};

function startMinutes(lesson: LessonEntry): number | null {
  return parseLessonTimeRange(lesson.time)?.start ?? null;
}

/**
 * Für jede Klasse die laufende und die nächste Stunde des Tages.
 *
 * Stunden ohne lesbare Zeitangabe („ganztägig") lassen sich nicht einordnen und
 * bleiben deshalb außen vor — für sie ist das vollständige Raster zuständig.
 */
export function collectClassLessonStates(
  schedulesByClass: ParsedSchedule,
  day: Weekday,
  nowMinutes: number,
): ClassLessonState[] {
  return Object.keys(schedulesByClass)
    .sort()
    .map((schoolClass) => {
      const entries = (schedulesByClass[schoolClass]?.[day] ?? [])
        .map((entry) => ({ entry, range: parseLessonTimeRange(entry.time) }))
        .filter((item): item is { entry: LessonEntry; range: { start: number; end: number } } => item.range !== null)
        .sort((a, b) => a.range.start - b.range.start || a.entry.period - b.entry.period);

      const current = entries.find(({ range }) => nowMinutes >= range.start && nowMinutes < range.end) ?? null;
      const next = entries.find(({ range }) => range.start > (current?.range.start ?? -1) && range.start > nowMinutes) ?? null;

      return {
        schoolClass,
        current: current?.entry ?? null,
        next: next?.entry ?? null,
      };
    });
}

/**
 * Läuft heute noch Unterricht? Erst wenn keine Klasse mehr eine laufende oder
 * kommende Stunde hat, ist Schulschluss — dann zeigt der Wandbildschirm wieder
 * den ganzen Tagesplan.
 */
export function hasOngoingSchoolDay(states: ClassLessonState[]): boolean {
  return states.some((state) => state.current !== null || state.next !== null);
}

/** Verbleibende Minuten bis zum Beginn einer Stunde — für „in 12 Min.". */
export function minutesUntilStart(lesson: LessonEntry, nowMinutes: number): number | null {
  const start = startMinutes(lesson);
  if (start === null) return null;
  return start - nowMinutes;
}
