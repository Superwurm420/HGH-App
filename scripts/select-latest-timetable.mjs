import fs from 'node:fs';
import path from 'node:path';

const TIMETABLE_DIR = path.join(process.cwd(), 'public/content/timetables');
const PATTERN = /^Stundenplan_kw_(\d{2})_Hj([12])_(\d{4})_(\d{2})\.pdf$/i;
const FALLBACK_PATTERN = /(\d{4})(?:\D{0,4}(\d{1,2}))?/;

function parseMeta(filename, stat) {
  const match = filename.match(PATTERN);
  if (match) {
    return {
      filename,
      kw: Number(match[1]),
      halfYear: Number(match[2]),
      yearStart: Number(match[3]),
      yearEndShort: Number(match[4]),
      lastModifiedMs: stat?.mtimeMs,
      source: 'name-pattern',
    };
  }

  // Fallback: Datei mit Jahreszahl im Namen
  const fallback = filename.match(FALLBACK_PATTERN);
  if (!fallback && !stat) return null;

  const fallbackYear = fallback ? Number(fallback[1]) : null;
  const fallbackKw = fallback?.[2] ? Number(fallback[2]) : Number.NaN;
  const yearStart = fallbackYear ?? new Date(stat.mtimeMs).getUTCFullYear();
  const kw = Number.isFinite(fallbackKw) ? Math.min(53, Math.max(1, fallbackKw)) : 53;

  return {
    filename,
    kw,
    halfYear: 2,
    yearStart,
    yearEndShort: (yearStart + 1) % 100,
    fallbackName: true,
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

function compare(a, b) {
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

if (!fs.existsSync(TIMETABLE_DIR)) {
  console.error(`Ordner fehlt: ${TIMETABLE_DIR}`);
  process.exit(1);
}

const files = fs.readdirSync(TIMETABLE_DIR).filter((f) => f.toLowerCase().endsWith('.pdf'));
const parsed = files
  .map((filename) => {
    const stat = fs.statSync(path.join(TIMETABLE_DIR, filename));
    return parseMeta(filename, stat);
  })
  .filter(Boolean)
  .sort(compare);

if (parsed.length === 0) {
  console.log('Keine gültige Stundenplan-PDF gefunden.');
  process.exit(0);
}

const latest = parsed[0];
if (latest.fallbackName) {
  console.warn(`HINWEIS: "${latest.filename}" nutzt nicht das Standard-Namensschema.`);
}
console.log(JSON.stringify(latest, null, 2));
