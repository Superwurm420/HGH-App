import fs from 'node:fs';
import path from 'node:path';

const TIMETABLE_DIR = path.join(process.cwd(), 'public/content/timetables');
const PATTERN = /^Stundenplan_kw_(\d{2})_Hj([12])_(\d{4})_(\d{2})\.pdf$/i;
const FALLBACK_PATTERN = /(\d{4}).*?(\d{1,2})/;

function parseMeta(filename) {
  const match = filename.match(PATTERN);
  if (match) {
    return {
      filename,
      kw: Number(match[1]),
      halfYear: Number(match[2]),
      yearStart: Number(match[3]),
      yearEndShort: Number(match[4]),
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
    fallbackName: true,
  };
}

function compare(a, b) {
  if (b.yearStart !== a.yearStart) return b.yearStart - a.yearStart;
  if (b.halfYear !== a.halfYear) return b.halfYear - a.halfYear;
  return b.kw - a.kw;
}

if (!fs.existsSync(TIMETABLE_DIR)) {
  console.error(`Ordner fehlt: ${TIMETABLE_DIR}`);
  process.exit(1);
}

const files = fs.readdirSync(TIMETABLE_DIR).filter((f) => f.toLowerCase().endsWith('.pdf'));
const parsed = files.map(parseMeta).filter(Boolean).sort(compare);

if (parsed.length === 0) {
  console.log('Keine gültige Stundenplan-PDF gefunden.');
  process.exit(0);
}

const latest = parsed[0];
if (latest.fallbackName) {
  console.warn(`HINWEIS: "${latest.filename}" nutzt nicht das Standard-Namensschema.`);
}
console.log(JSON.stringify(latest, null, 2));
