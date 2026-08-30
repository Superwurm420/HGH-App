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

/** Minuten seit Mitternacht → „08:00". */
function formatClock(minutes: number): string {
  const hour = Math.floor(minutes / 60) % 24;
  const minute = minutes % 60;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

/**
 * Die Zeitangabe einer Stunde einheitlich schreiben: „8.00 - 9.30" → „08:00–09:30".
 *
 * Im PDF steht mal Punkt, mal Doppelpunkt, mal ein Bindestrich mit, mal ohne
 * Leerzeichen. Angezeigt wurde bisher, was zufällig im PDF stand — in der
 * Wochenansicht dagegen ein per `replace('.', ':')` zurechtgebogener Anfang.
 * Was nicht als Zeitspanne lesbar ist (z. B. „ganztägig"), bleibt unverändert.
 */
export function formatLessonTime(time: string): string {
  const range = parseLessonTimeRange(time);
  if (!range) return time.trim();
  return `${formatClock(range.start)}–${formatClock(range.end)}`;
}

/**
 * Beschriftung der Stunde: „1." bzw. „1.–2." für einen Block.
 *
 * Vorher schrieb jede Ansicht ihre eigene Variante — „1+2.", „Std. 1/2", „1." —,
 * obwohl dieselbe Sache gemeint war.
 */
export function formatPeriodLabel(period: number, periodEnd?: number | null): string {
  if (periodEnd && periodEnd > period) {
    return `${period}.–${periodEnd}.`;
  }
  return `${period}.`;
}

/**
 * Startzeit je Einzelstunde — die Grundlage der Stundenspalte in Wochen- und
 * TV-Ansicht.
 *
 * Bisher bekam jede Stunde eines Blocks dessen Anfangszeit: Ein Block von der
 * 1. bis zur 4. Stunde („8.00 - 11.15") ließ alle vier Zeilen „8:00" anzeigen.
 * Deshalb zählen zuerst die Einzelstunden — die tragen ihre echte Zeit —, und
 * erst wo keine vorliegt, wird ein Block gleichmäßig auf seine Stunden
 * aufgeteilt.
 */
export function collectPeriodStartTimes(lessons: LessonEntry[]): Map<number, string> {
  const exact = new Map<number, number>();
  const estimated = new Map<number, number>();

  for (const lesson of lessons) {
    const range = parseLessonTimeRange(lesson.time);
    if (!range) continue;

    const periodEnd = lesson.periodEnd ?? lesson.period;
    const count = periodEnd - lesson.period + 1;

    if (count <= 1) {
      if (!exact.has(lesson.period)) exact.set(lesson.period, range.start);
      continue;
    }

    const step = (range.end - range.start) / count;
    for (let index = 0; index < count; index += 1) {
      const period = lesson.period + index;
      if (estimated.has(period)) continue;
      estimated.set(period, Math.round(range.start + index * step));
    }
  }

  const result = new Map<number, string>();
  for (const [period, minutes] of [...estimated, ...exact]) {
    result.set(period, formatClock(minutes));
  }

  return new Map([...result].sort((a, b) => a[0] - b[0]));
}
