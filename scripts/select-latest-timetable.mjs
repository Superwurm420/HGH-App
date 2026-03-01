import fs from 'node:fs';
import path from 'node:path';
import { parseTimetableFilename, compareTimetable } from './lib/timetable-selection.mjs';

const TIMETABLE_DIR = path.join(process.cwd(), 'public/content/timetables');

if (!fs.existsSync(TIMETABLE_DIR)) {
  console.error(`Ordner fehlt: ${TIMETABLE_DIR}`);
  process.exit(1);
}

const files = fs.readdirSync(TIMETABLE_DIR).filter((f) => f.toLowerCase().endsWith('.pdf'));
const parsed = files
  .map((filename) => {
    const stat = fs.statSync(path.join(TIMETABLE_DIR, filename));
    return parseTimetableFilename(filename, stat);
  })
  .filter(Boolean)
  .sort(compareTimetable);

if (parsed.length === 0) {
  console.log('Keine gültige Stundenplan-PDF gefunden.');
  process.exit(0);
}

const latest = parsed[0];
if (latest.source !== 'name-pattern') {
  console.warn(`HINWEIS: "${latest.filename}" nutzt nicht das Standard-Namensschema.`);
}
console.log(JSON.stringify(latest, null, 2));
