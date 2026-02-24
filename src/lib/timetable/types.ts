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
};

export type LessonEntry = {
  period: number;
  periodEnd?: number; // Für Doppelstunden (z.B. 1+2 → periodEnd=2)
  time: string;
  subject?: string;
  detail?: string;
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
