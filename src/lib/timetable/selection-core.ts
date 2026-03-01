// Zentrale Selektionslogik für Stundenpläne.
// Änderungen an Parsing, Vergleich und Sortierung ausschließlich in diesem Modul vornehmen.

const FILENAME_PATTERN = /^Stundenplan_kw_(\d{2})_Hj([12])_(\d{4})_(\d{2})\.pdf$/i;
const FALLBACK_PATTERN = /(\d{4})(?:\D{0,4}(\d{1,2}))?/;

function parseDateFromName(filename: string) {
  const base = filename.replace(/\.pdf$/i, '');
  const iso = base.match(/(20\d{2})[-_.]?(\d{2})[-_.]?(\d{2})/);
  if (!iso) return null;
  const year = Number(iso[1]);
  const month = Number(iso[2]);
  const day = Number(iso[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return Date.UTC(year, month - 1, day);
}

function getIsoWeekMondayUtc(year: number, isoWeek: number) {
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const jan4Day = jan4.getUTCDay() || 7;
  const week1Monday = new Date(jan4);
  week1Monday.setUTCDate(jan4.getUTCDate() - jan4Day + 1);

  const monday = new Date(week1Monday);
  monday.setUTCDate(week1Monday.getUTCDate() + (isoWeek - 1) * 7);
  return monday.getTime();
}

function resolveCalendarYear(meta: { yearStart: number; halfYear: number; kw: number }) {
  if (meta.halfYear === 2) return meta.yearStart + 1;
  return meta.kw <= 6 ? meta.yearStart + 1 : meta.yearStart;
}

function getTimetableStartUtc(meta: { yearStart: number; halfYear: number; kw: number }) {
  const calendarYear = resolveCalendarYear(meta);
  return getIsoWeekMondayUtc(calendarYear, meta.kw);
}

export function parseTimetableFilename(filename: string, options: { lastModifiedMs?: number } = {}) {
  const match = filename.match(FILENAME_PATTERN);
  if (match) {
    return {
      filename,
      kw: Number(match[1]),
      halfYear: Number(match[2]) as 1 | 2,
      yearStart: Number(match[3]),
      yearEndShort: Number(match[4]),
      href: `/content/timetables/${filename}`,
      source: 'name-pattern' as const,
      lastModifiedMs: options.lastModifiedMs,
    };
  }

  const fallback = filename.match(FALLBACK_PATTERN);
  if (!fallback) {
    if (typeof options.lastModifiedMs === 'number') {
      const date = new Date(options.lastModifiedMs);
      const yearStart = date.getUTCFullYear();
      return {
        filename,
        kw: 53,
        halfYear: 2 as const,
        yearStart,
        yearEndShort: (yearStart + 1) % 100,
        href: `/content/timetables/${filename}`,
        source: 'file-mtime' as const,
        lastModifiedMs: options.lastModifiedMs,
      };
    }
    return null;
  }

  const yearStart = Number(fallback[1]);
  const kwCandidate = Number(fallback[2]);
  const kw = Number.isFinite(kwCandidate) && kwCandidate > 0
    ? Math.min(53, Math.max(1, kwCandidate))
    : 53;

  const namedDate = parseDateFromName(filename);
  const mtimeDate = typeof options.lastModifiedMs === 'number' ? options.lastModifiedMs : 0;
  const rankDate = namedDate ?? mtimeDate;
  const computedYearStart = rankDate ? new Date(rankDate).getUTCFullYear() : yearStart;

  return {
    filename,
    kw: rankDate ? 53 : kw,
    halfYear: 2 as const,
    yearStart: computedYearStart,
    yearEndShort: (computedYearStart + 1) % 100,
    href: `/content/timetables/${filename}`,
    source: 'name-fallback' as const,
    lastModifiedMs: options.lastModifiedMs,
  };
}

export function compareTimetable(
  a: { yearStart: number; halfYear: number; kw: number; lastModifiedMs?: number; filename: string },
  b: { yearStart: number; halfYear: number; kw: number; lastModifiedMs?: number; filename: string },
) {
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

export function selectLatestTimetable(files: string[]) {
  const parsed = files
    .map((filename) => parseTimetableFilename(filename))
    .filter((item) => item !== null)
    .sort(compareTimetable);

  return parsed[0] ?? null;
}
