/**
 * Shared timetable filename parsing and selection logic.
 *
 * This module is the single source of truth for the build-time scripts.
 * The runtime TypeScript equivalent lives at src/lib/timetable/selectLatest.ts
 * and must be kept in sync with this file.
 */

const FILENAME_PATTERN = /^Stundenplan_kw_(\d{2})_Hj([12])_(\d{4})_(\d{2})\.pdf$/i;
const FALLBACK_PATTERN = /(\d{4})(?:\D{0,4}(\d{1,2}))?/;

export function parseTimetableFilename(filename, stat) {
  const match = filename.match(FILENAME_PATTERN);
  if (match) {
    return {
      filename,
      kw: Number(match[1]),
      halfYear: Number(match[2]),
      yearStart: Number(match[3]),
      yearEndShort: Number(match[4]),
      href: `/content/timetables/${filename}`,
      source: 'name-pattern',
      lastModifiedMs: stat?.mtimeMs,
    };
  }

  const fallback = filename.match(FALLBACK_PATTERN);
  if (!fallback && !stat) return null;

  const fallbackYear = fallback ? Number(fallback[1]) : null;
  const fallbackKw = fallback?.[2] ? Number(fallback[2]) : Number.NaN;
  const hasMtime = typeof stat?.mtimeMs === 'number';
  const mtimeYear = hasMtime ? new Date(stat.mtimeMs).getUTCFullYear() : null;
  const yearStart = fallbackYear ?? mtimeYear;
  if (!yearStart) return null;

  const kw = Number.isFinite(fallbackKw)
    ? Math.min(53, Math.max(1, fallbackKw))
    : 53;

  return {
    filename,
    kw,
    halfYear: 2,
    yearStart,
    yearEndShort: (yearStart + 1) % 100,
    href: `/content/timetables/${filename}`,
    source: fallback ? 'name-fallback' : 'file-mtime',
    lastModifiedMs: stat?.mtimeMs,
  };
}

function getIsoWeekMondayUtc(year, isoWeek) {
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const jan4Day = jan4.getUTCDay() || 7;
  const week1Monday = new Date(jan4);
  week1Monday.setUTCDate(jan4.getUTCDate() - jan4Day + 1);

  const monday = new Date(week1Monday);
  monday.setUTCDate(week1Monday.getUTCDate() + (isoWeek - 1) * 7);
  return monday.getTime();
}

function resolveCalendarYear(meta) {
  if (meta.halfYear === 2) return meta.yearStart + 1;
  return meta.kw <= 6 ? meta.yearStart + 1 : meta.yearStart;
}

function getTimetableStartUtc(meta) {
  const calendarYear = resolveCalendarYear(meta);
  return getIsoWeekMondayUtc(calendarYear, meta.kw);
}

export function compareTimetable(a, b) {
  const aStart = getTimetableStartUtc(a);
  const bStart = getTimetableStartUtc(b);
  const aMtime = a.lastModifiedMs ?? 0;
  const bMtime = b.lastModifiedMs ?? 0;
  if (bStart !== aStart) return bStart - aStart;
  if (b.yearStart !== a.yearStart) return b.yearStart - a.yearStart;
  if (b.halfYear !== a.halfYear) return b.halfYear - a.halfYear;
  if (b.kw !== a.kw) return b.kw - a.kw;
  if (bMtime !== aMtime) return bMtime - aMtime;
  return a.filename.localeCompare(b.filename, 'de');
}
