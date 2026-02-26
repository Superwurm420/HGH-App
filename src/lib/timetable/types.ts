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

/** Parse a German "DD.MM.YYYY HH:mm" date string and return its Weekday key, or null. */
export function dayFromGermanDate(value: string): Weekday | null {
  const [datePart] = value.split(' ');
  const [day, month, year] = datePart.split('.').map(Number);
  if (!day || !month || !year) return null;
  const jsDay = new Date(year, month - 1, day).getDay();
  const map: Record<number, Weekday | null> = { 0: null, 1: 'MO', 2: 'DI', 3: 'MI', 4: 'DO', 5: 'FR', 6: null };
  return map[jsDay] ?? null;
}
