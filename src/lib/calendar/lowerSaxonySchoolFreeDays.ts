export type BerlinDateParts = {
  year: number;
  month: number;
  day: number;
};

export type SchoolHolidayRange = {
  start: string;
  end: string;
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
  const goodFriday = addUtcDays(easter, -2);
  const easterMonday = addUtcDays(easter, 1);
  const ascensionDay = addUtcDays(easter, 39);
  const pentecostMonday = addUtcDays(easter, 50);

  const list = [
    toDateKey(year, 1, 1),
    toDateKey(year, 5, 1),
    toDateKey(year, 10, 3),
    toDateKey(year, 10, 31),
    toDateKey(year, 12, 25),
    toDateKey(year, 12, 26),
    toDateKey(goodFriday.getUTCFullYear(), goodFriday.getUTCMonth() + 1, goodFriday.getUTCDate()),
    toDateKey(easterMonday.getUTCFullYear(), easterMonday.getUTCMonth() + 1, easterMonday.getUTCDate()),
    toDateKey(ascensionDay.getUTCFullYear(), ascensionDay.getUTCMonth() + 1, ascensionDay.getUTCDate()),
    toDateKey(pentecostMonday.getUTCFullYear(), pentecostMonday.getUTCMonth() + 1, pentecostMonday.getUTCDate()),
  ];

  return new Set(list);
}

export function isLowerSaxonyPublicHoliday(date: BerlinDateParts): boolean {
  const key = toDateKey(date.year, date.month, date.day);
  return getNiedersachsenHolidayKeys(date.year).has(key);
}

export function isDateInSchoolHolidayRanges(date: BerlinDateParts, ranges: SchoolHolidayRange[]): boolean {
  const key = parseDateKey(toDateKey(date.year, date.month, date.day));

  return ranges.some((range) => {
    const start = parseDateKey(range.start);
    const end = parseDateKey(range.end);
    return Number.isFinite(start) && Number.isFinite(end) && key >= start && key <= end;
  });
}
