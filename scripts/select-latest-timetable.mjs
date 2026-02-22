import fs from 'node:fs';
import path from 'node:path';

const TIMETABLE_DIR = path.join(process.cwd(), 'public/content/timetables');
const PATTERN = /^Stundenplan_kw_(\d{2})_Hj([12])_(\d{4})_(\d{2})\.pdf$/i;

function parseMeta(filename) {
  const match = filename.match(PATTERN);
  if (!match) return null;
  return {
    filename,
    kw: Number(match[1]),
    halfYear: Number(match[2]),
    yearStart: Number(match[3]),
    yearEndShort: Number(match[4]),
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
console.log(JSON.stringify(latest, null, 2));
