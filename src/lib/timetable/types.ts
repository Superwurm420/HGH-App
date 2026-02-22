export const CLASSES = ['HT11', 'HT12', 'HT21', 'HT22', 'G11', 'G12', 'GT01'] as const;
export type SchoolClass = (typeof CLASSES)[number];

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
  time: string;
  subject?: string;
  detail?: string;
};

export type WeekPlan = Record<Weekday, LessonEntry[]>;
export type ParsedSchedule = Record<SchoolClass, WeekPlan>;

export type SpecialEvent = {
  id: string;
  title: string;
  audience?: string;
  classes: SchoolClass[] | 'alle';
  startsAt: string;
  endsAt?: string;
  details?: string;
};
