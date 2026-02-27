type BerlinDateParts = {
  year: number;
  month: number;
  day: number;
};

function toDateKey(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function parseDateKey(dateKey: string): number {
  return Date.parse(`${dateKey}T00:00:00Z`);
}

function getEasterSundayUtc(year: number): Date {
  // Gauß-Algorithmus (gregorianischer Kalender)
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(year, month - 1, day));
}

function addUtcDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
}

function getNiedersachsenHolidayKeys(year: number): Set<string> {
  const easter = getEasterSundayUtc(year);
  const list = [
    toDateKey(year, 1, 1),
    toDateKey(year, 5, 1),
    toDateKey(year, 10, 3),
    toDateKey(year, 10, 31),
    toDateKey(year, 12, 25),
    toDateKey(year, 12, 26),
    toDateKey(addUtcDays(easter, -2).getUTCFullYear(), addUtcDays(easter, -2).getUTCMonth() + 1, addUtcDays(easter, -2).getUTCDate()), // Karfreitag
    toDateKey(addUtcDays(easter, 1).getUTCFullYear(), addUtcDays(easter, 1).getUTCMonth() + 1, addUtcDays(easter, 1).getUTCDate()), // Ostermontag
    toDateKey(addUtcDays(easter, 39).getUTCFullYear(), addUtcDays(easter, 39).getUTCMonth() + 1, addUtcDays(easter, 39).getUTCDate()), // Christi Himmelfahrt
    toDateKey(addUtcDays(easter, 50).getUTCFullYear(), addUtcDays(easter, 50).getUTCMonth() + 1, addUtcDays(easter, 50).getUTCDate()), // Pfingstmontag
  ];

  return new Set(list);
}

// Niedersächsische Schulferien/Ferientage.
// Stand: Schuljahre 2024/25 bis 2026/27.
const LOWER_SAXONY_SCHOOL_HOLIDAY_RANGES: Array<{ start: string; end: string }> = [
  { start: '2024-10-04', end: '2024-10-19' },
  { start: '2024-11-01', end: '2024-11-01' },
  { start: '2024-12-23', end: '2025-01-04' },
  { start: '2025-02-03', end: '2025-02-04' },
  { start: '2025-04-07', end: '2025-04-19' },
  { start: '2025-05-30', end: '2025-05-30' },
  { start: '2025-07-03', end: '2025-08-13' },
  { start: '2025-10-13', end: '2025-10-25' },
  { start: '2025-12-22', end: '2026-01-05' },
  { start: '2026-02-02', end: '2026-02-03' },
  { start: '2026-03-23', end: '2026-04-07' },
  { start: '2026-05-15', end: '2026-05-15' },
  { start: '2026-07-02', end: '2026-08-12' },
  { start: '2026-10-19', end: '2026-10-30' },
  { start: '2026-12-23', end: '2027-01-09' },
];

export function isLowerSaxonyPublicHoliday(date: BerlinDateParts): boolean {
  const key = toDateKey(date.year, date.month, date.day);
  return getNiedersachsenHolidayKeys(date.year).has(key);
}

export function isLowerSaxonySchoolHoliday(date: BerlinDateParts): boolean {
  const key = parseDateKey(toDateKey(date.year, date.month, date.day));

  return LOWER_SAXONY_SCHOOL_HOLIDAY_RANGES.some((range) => {
    const start = parseDateKey(range.start);
    const end = parseDateKey(range.end);
    return key >= start && key <= end;
  });
}

