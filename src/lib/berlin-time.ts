import type { BerlinDateParts } from '@/lib/calendar/lowerSaxonySchoolFreeDays';
import type { Weekday } from '@/lib/timetable/types';

// ── Cached Intl.DateTimeFormat instances ──────────────────────────────────────

const berlinFullFormatter = new Intl.DateTimeFormat('de-DE', {
  timeZone: 'Europe/Berlin',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  weekday: 'short',
  hour12: false,
});

const berlinCalendarWeekFormatter = new Intl.DateTimeFormat('de-DE', {
  timeZone: 'Europe/Berlin',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

// ── Public helpers ───────────────────────────────────────────────────────────

export type BerlinNowParts = BerlinDateParts & {
  hour: number;
  minute: number;
  weekdayShort: string;
};

export function getBerlinNowParts(date: Date = new Date()): BerlinNowParts {
  const parts = berlinFullFormatter.formatToParts(date);
  return {
    year: Number(parts.find((p) => p.type === 'year')?.value ?? 0),
    month: Number(parts.find((p) => p.type === 'month')?.value ?? 0),
    day: Number(parts.find((p) => p.type === 'day')?.value ?? 0),
    hour: Number(parts.find((p) => p.type === 'hour')?.value ?? 0),
    minute: Number(parts.find((p) => p.type === 'minute')?.value ?? 0),
    weekdayShort: parts.find((p) => p.type === 'weekday')?.value ?? '',
  };
}

export function timeToMinutes(h: number, m: number): number {
  return h * 60 + m;
}

export function getIsoCalendarWeek(date: Date): number {
  const parts = berlinCalendarWeekFormatter.formatToParts(date);

  const day = Number(parts.find((p) => p.type === 'day')?.value ?? 1);
  const month = Number(parts.find((p) => p.type === 'month')?.value ?? 1);
  const year = Number(parts.find((p) => p.type === 'year')?.value ?? 1970);

  const utcDate = new Date(Date.UTC(year, month - 1, day));
  const weekday = utcDate.getUTCDay() || 7;
  utcDate.setUTCDate(utcDate.getUTCDate() + 4 - weekday);

  const yearStart = new Date(Date.UTC(utcDate.getUTCFullYear(), 0, 1));
  return Math.ceil(((utcDate.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

const berlinDayFormatter = new Intl.DateTimeFormat('de-DE', {
  timeZone: 'Europe/Berlin',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

/**
 * Zeitstempel aus der Datenbank als deutsches Datum („29.08.2026").
 *
 * SQLite schreibt `datetime('now')` als „YYYY-MM-DD HH:MM:SS" in UTC — ohne
 * Zeitzonenkennung. JavaScript deutet das als Ortszeit, was im Worker (UTC)
 * zufällig stimmt, im Browser aber nicht. Hier wird die Kennung deshalb
 * ergänzt und anschließend nach Berlin umgerechnet.
 *
 * `toLocaleDateString('de-DE')` ohne Optionen lieferte außerdem „29.8.2026",
 * während Ankündigungen „01.09.2026" anzeigen — zwei Schreibweisen auf
 * derselben Seite.
 */
export function formatBerlinDay(value: string): string {
  const withZone = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(:\d{2})?$/.test(value)
    ? `${value.replace(' ', 'T')}Z`
    : value;

  const date = new Date(withZone);
  if (Number.isNaN(date.getTime())) return value;

  return berlinDayFormatter.format(date);
}

export function isWeekend(weekdayShort: string): boolean {
  return weekdayShort.startsWith('Sa') || weekdayShort.startsWith('So');
}

// ── Wochentag ────────────────────────────────────────────────────────────────

const WEEKDAY_MAP: Record<string, Weekday> = {
  Mo: 'MO', Di: 'DI', Mi: 'MI', Do: 'DO', Fr: 'FR',
};

/**
 * Der heutige Wochentag als Stundenplan-Code.
 * Am Wochenende gibt es keine Spalte im Plan — dann zeigen wir Montag.
 *
 * Auf die ersten beiden Buchstaben gekürzt: Im kombinierten Datums-/Zeit-Format
 * hängt `de-DE` an den Kurznamen einen Punkt an („Fr." statt „Fr"). Das
 * Nachschlagen mit dem ungekürzten Wert traf deshalb nie zu — und der Plan
 * zeigte an jedem Wochentag den Montag.
 */
export function weekdayForToday(date: Date = new Date()): Weekday {
  const short = getBerlinNowParts(date).weekdayShort.slice(0, 2);
  return WEEKDAY_MAP[short] ?? 'MO';
}

// ── Deutsches Datum ──────────────────────────────────────────────────────────

/**
 * Parst ein deutsches Datum (DD.MM.YYYY HH:mm) als Berlin-Zeitzone.
 *
 * Ankündigungen speichern ihre Zeiten in diesem Format — ein Erbe aus der Zeit,
 * als Inhalte noch als TXT-Dateien gepflegt wurden. Der UTC-Offset wird über
 * Intl ermittelt (CET +01:00 im Winter, CEST +02:00 im Sommer) statt fest
 * angenommen.
 *
 * Gibt `null` zurück, wenn die Eingabe nicht dem Format entspricht oder kein
 * gültiges Datum ergibt — der Rückweg über den Formatter prüft das nach.
 */
export function parseBerlinDate(value: string): Date | null {
  const match = value.match(/^(\d{2})\.(\d{2})\.(\d{4})\s+(\d{2}):(\d{2})$/);
  if (!match) return null;

  const [, dayStr, monthStr, yearStr, hourStr, minuteStr] = match;
  const [year, month, day, hour, minute] = [yearStr, monthStr, dayStr, hourStr, minuteStr].map(Number);

  // Mit CET (+01:00) als Näherung starten …
  const parsed = new Date(`${yearStr}-${monthStr}-${dayStr}T${hourStr}:${minuteStr}:00+01:00`);
  if (Number.isNaN(parsed.getTime())) return null;

  // … und um die Differenz zum tatsächlichen Berlin-Offset korrigieren.
  const shownHour = Number(
    berlinFullFormatter.formatToParts(parsed).find((p) => p.type === 'hour')?.value ?? 0,
  );
  if (shownHour !== hour) {
    parsed.setTime(parsed.getTime() + (hour - shownHour) * 3600_000);
  }

  // Gegenprobe: Nur wenn Berlin dasselbe Datum zurückgibt, war die Eingabe gültig.
  const check = getBerlinNowParts(parsed);
  if (
    check.year !== year || check.month !== month || check.day !== day ||
    check.hour !== hour || check.minute !== minute
  ) {
    return null;
  }

  return parsed;
}
