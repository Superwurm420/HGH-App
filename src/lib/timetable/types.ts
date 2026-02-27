export type SchoolClass = string;

export const WEEKDAYS = ['MO', 'DI', 'MI', 'DO', 'FR'] as const;
export type Weekday = (typeof WEEKDAYS)[number];

export type TimetableMeta = {
  filename: string;
  kw: number;
  halfYear: 1 | 2;
  yearStart: number;
  yearEndShort: number;
  href: string;
  lastModifiedMs?: number;
  source?: 'name-pattern' | 'name-fallback' | 'file-mtime';
};

export type LessonEntry = {
  period: number;
  periodEnd?: number; // Für Doppelstunden (z.B. 1+2 → periodEnd=2)
  time: string;
  subject?: string;
  detail?: string;
  room?: string;
};

export type WeekPlan = Record<Weekday, LessonEntry[]>;
export type ParsedSchedule = Record<string, WeekPlan>;

export type SpecialEvent = {
  id: string;
  title: string;
  audience?: string;
  classes: SchoolClass[] | 'alle';
  startsAt: string;
  endsAt?: string;
  details?: string;
};

function parseGermanDate(value: string): Date | null {
  const [datePart] = value.split(' ');
  const [day, month, year] = datePart.split('.').map(Number);
  if (!day || !month || !year) return null;
  const date = new Date(year, month - 1, day);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function startOfDay(value: Date): Date {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

export function eventAppliesToDay(event: Pick<SpecialEvent, 'startsAt' | 'endsAt'>, day: Weekday): boolean {
  const startDate = parseGermanDate(event.startsAt);
  if (!startDate) return false;

  const targetJsDay = WEEKDAYS.indexOf(day) + 1;
  let endDate = event.endsAt ? parseGermanDate(event.endsAt) : null;
  if (!endDate || endDate < startDate) endDate = startDate;

  for (let current = startOfDay(startDate); current <= endDate; current = new Date(current.getFullYear(), current.getMonth(), current.getDate() + 1)) {
    if (current.getDay() === targetJsDay) return true;
  }

  return false;
}
/** Parse a German "DD.MM.YYYY HH:mm" date string and return its Weekday key, or null. */
export function dayFromGermanDate(value: string): Weekday | null {
  const [datePart] = value.split(' ');
  const [day, month, year] = datePart.split('.').map(Number);
  if (!day || !month || !year) return null;
  const jsDay = new Date(year, month - 1, day).getDay();
  const map: Record<number, Weekday | null> = { 0: null, 1: 'MO', 2: 'DI', 3: 'MI', 4: 'DO', 5: 'FR', 6: null };
  return map[jsDay] ?? null;
}
