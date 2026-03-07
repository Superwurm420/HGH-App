/**
 * Feiertags- und Schulferienlogik für Niedersachsen.
 * Wird von DailyMessage und berlin-time genutzt.
 */

export type BerlinDateParts = {
  year: number;
  month: number;
  day: number;
};

export type SchoolHolidayRange = {
  start: string; // YYYY-MM-DD
  end: string;   // YYYY-MM-DD
};

/**
 * Prüft ob ein Datum in einem Schulferienbereich liegt.
 */
export function isDateInSchoolHolidayRanges(
  date: BerlinDateParts,
  ranges: SchoolHolidayRange[],
): boolean {
  const iso = `${date.year}-${String(date.month).padStart(2, '0')}-${String(date.day).padStart(2, '0')}`;
  return ranges.some((r) => iso >= r.start && iso <= r.end);
}

/**
 * Prüft ob ein Datum ein gesetzlicher Feiertag in Niedersachsen ist.
 * Niedersachsen hat nur die bundeseinheitlichen Feiertage + Reformationstag.
 */
export function isLowerSaxonyPublicHoliday(date: BerlinDateParts): boolean {
  const { year, month, day } = date;

  // Feste Feiertage
  const fixed: Array<[number, number]> = [
    [1, 1],   // Neujahr
    [5, 1],   // Tag der Arbeit
    [10, 3],  // Tag der Deutschen Einheit
    [10, 31], // Reformationstag (Niedersachsen)
    [12, 25], // 1. Weihnachtsfeiertag
    [12, 26], // 2. Weihnachtsfeiertag
  ];

  if (fixed.some(([m, d]) => month === m && day === d)) return true;

  // Bewegliche Feiertage basierend auf Ostern (Gaußsche Osterformel)
  const easter = computeEasterSunday(year);
  const easterMs = easter.getTime();
  const dayMs = 86_400_000;

  const movable = [
    -2,  // Karfreitag
    0,   // Ostersonntag
    1,   // Ostermontag
    39,  // Christi Himmelfahrt
    49,  // Pfingstsonntag
    50,  // Pfingstmontag
  ];

  const checkDate = new Date(year, month - 1, day);
  const checkMs = checkDate.getTime();

  return movable.some((offset) => Math.abs(checkMs - (easterMs + offset * dayMs)) < dayMs / 2);
}

/**
 * Berechnet das Datum des Ostersonntags (Gaußsche Osterformel).
 */
function computeEasterSunday(year: number): Date {
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
  return new Date(year, month - 1, day);
}
