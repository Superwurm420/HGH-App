import { TimetableMeta } from './types';

const PATTERN = /^Stundenplan_kw_(\d{2})_Hj([12])_(\d{4})_(\d{2})\.pdf$/i;
const FALLBACK_PATTERN = /(\d{4}).*?(\d{1,2})/;

/**
 * Parst den Dateinamen einer Stundenplan-PDF.
 *
 * Bevorzugtes Schema: Stundenplan_kw_XX_HjY_YYYY_YY.pdf
 * Fallback: Jede PDF mit einer Jahreszahl wird erkannt.
 */
export function parseTimetableFilename(filename: string): TimetableMeta | null {
  const match = filename.match(PATTERN);
  if (match) {
    return {
      filename,
      kw: Number(match[1]),
      halfYear: Number(match[2]) as 1 | 2,
      yearStart: Number(match[3]),
      yearEndShort: Number(match[4]),
      href: `/content/timetables/${filename}`,
    };
  }

  // Fallback: Datei mit Jahreszahl im Namen
  const fallback = filename.match(FALLBACK_PATTERN);
  if (!fallback) return null;

  const yearStart = Number(fallback[1]);
  const kw = Math.min(53, Math.max(1, Number(fallback[2])));

  return {
    filename,
    kw,
    halfYear: 2,
    yearStart,
    yearEndShort: (yearStart + 1) % 100,
    href: `/content/timetables/${filename}`,
  };
}

export function compareTimetable(a: TimetableMeta, b: TimetableMeta): number {
  if (b.yearStart !== a.yearStart) return b.yearStart - a.yearStart;
  if (b.halfYear !== a.halfYear) return b.halfYear - a.halfYear;
  return b.kw - a.kw;
}

export function selectLatestTimetable(files: string[]): TimetableMeta | null {
  const parsed = files.map(parseTimetableFilename).filter((item): item is TimetableMeta => item !== null);
  parsed.sort(compareTimetable);
  return parsed[0] ?? null;
}
