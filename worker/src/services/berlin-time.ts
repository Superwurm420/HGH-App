/**
 * Berlin-Zeitzone Utilities.
 * Identisch zur bisherigen Logik, aber ohne Node.js-Abhängigkeiten.
 */

const berlinTimeFormatter = new Intl.DateTimeFormat('de-DE', {
  timeZone: 'Europe/Berlin',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

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

const berlinDateFormatter = new Intl.DateTimeFormat('de-DE', {
  timeZone: 'Europe/Berlin',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

export type BerlinNowParts = {
  year: number;
  month: number;
  day: number;
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

export function getBerlinMinutes(date: Date = new Date()): number {
  const parts = berlinTimeFormatter.formatToParts(date);
  const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? 0);
  const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? 0);
  return hour * 60 + minute;
}

export function formatBerlinDate(date: Date): string {
  return berlinDateFormatter.format(date);
}

export function getIsoCalendarWeek(date: Date = new Date()): number {
  const parts = berlinDateFormatter.formatToParts(date);
  const day = Number(parts.find((p) => p.type === 'day')?.value ?? 1);
  const month = Number(parts.find((p) => p.type === 'month')?.value ?? 1);
  const year = Number(parts.find((p) => p.type === 'year')?.value ?? 1970);
  const utcDate = new Date(Date.UTC(year, month - 1, day));
  const weekday = utcDate.getUTCDay() || 7;
  utcDate.setUTCDate(utcDate.getUTCDate() + 4 - weekday);
  const yearStart = new Date(Date.UTC(utcDate.getUTCFullYear(), 0, 1));
  return Math.ceil(((utcDate.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

export function isWeekend(weekdayShort: string): boolean {
  return weekdayShort.startsWith('Sa') || weekdayShort.startsWith('So');
}

const WEEKDAY_MAP: Record<string, string> = {
  'Mo': 'MO', 'Di': 'DI', 'Mi': 'MI', 'Do': 'DO', 'Fr': 'FR',
};

export function weekdayForToday(date: Date = new Date()): string {
  const { weekdayShort } = getBerlinNowParts(date);
  return WEEKDAY_MAP[weekdayShort] ?? 'MO';
}

/**
 * Parst ein deutsches Datum (DD.MM.YYYY HH:mm) in Berlin-Zeitzone.
 */
export function parseBerlinDate(dateStr: string): Date | null {
  const match = dateStr.match(/^(\d{2})\.(\d{2})\.(\d{4})\s+(\d{2}):(\d{2})$/);
  if (!match) return null;
  const [, day, month, year, hour, minute] = match;
  // Einfache Näherung: UTC-Offset für Berlin (CET=+1, CEST=+2)
  const utcDate = new Date(`${year}-${month}-${day}T${hour}:${minute}:00+01:00`);
  return Number.isNaN(utcDate.getTime()) ? null : utcDate;
}
