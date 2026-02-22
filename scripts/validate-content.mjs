import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const timetableDir = path.join(root, 'public/content/timetables');
const announcementDir = path.join(root, 'public/content/announcements');

const timetablePattern = /^Stundenplan_kw_(\d{2})_Hj([12])_(\d{4})_(\d{2})\.pdf$/i;
const deDateTimePattern = /^\d{2}\.\d{2}\.\d{4} \d{2}:\d{2}$/;

let hasError = false;

function warn(msg) {
  console.warn(`WARN: ${msg}`);
}

function fail(msg) {
  hasError = true;
  console.error(`ERROR: ${msg}`);
}

function readDirSafe(dir) {
  if (!fs.existsSync(dir)) {
    fail(`Ordner fehlt: ${dir}`);
    return [];
  }
  return fs.readdirSync(dir);
}

function validateTimetables() {
  const files = readDirSafe(timetableDir).filter((f) => f.toLowerCase().endsWith('.pdf'));
  if (files.length === 0) warn('Keine PDF in public/content/timetables gefunden.');

  for (const file of files) {
    const m = file.match(timetablePattern);
    if (!m) {
      fail(`Ungültiger Stundenplan-Dateiname: ${file}`);
      continue;
    }

    const kw = Number(m[1]);
    if (kw < 1 || kw > 53) fail(`KW außerhalb Bereich 01-53: ${file}`);
  }
}

function parseAnnouncement(raw) {
  const [headerRaw, ...bodyParts] = raw.split('\n---\n');
  const body = bodyParts.join('\n---\n').trim();
  const headers = {};

  for (const line of headerRaw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || !trimmed.includes(':')) continue;
    const idx = trimmed.indexOf(':');
    const key = trimmed.slice(0, idx).trim().toLowerCase();
    const value = trimmed.slice(idx + 1).trim();
    headers[key] = value;
  }

  return { headers, body };
}

function validateAnnouncements() {
  const files = readDirSafe(announcementDir).filter((f) => f.toLowerCase().endsWith('.txt'));
  if (files.length === 0) warn('Keine TXT in public/content/announcements gefunden.');

  for (const file of files) {
    const fullPath = path.join(announcementDir, file);
    const raw = fs.readFileSync(fullPath, 'utf8');
    const { headers, body } = parseAnnouncement(raw);

    if (!headers.title) fail(`${file}: Feld 'title' fehlt.`);
    if (!headers.date) fail(`${file}: Feld 'date' fehlt.`);
    if (headers.date && !deDateTimePattern.test(headers.date)) {
      fail(`${file}: 'date' muss Format TT.MM.JJJJ HH:mm haben.`);
    }
    if (headers.expires && !deDateTimePattern.test(headers.expires)) {
      fail(`${file}: 'expires' muss Format TT.MM.JJJJ HH:mm haben.`);
    }
    if (!body) warn(`${file}: kein Text nach '---' gefunden.`);
  }
}

validateTimetables();
validateAnnouncements();

if (hasError) {
  console.error('Validierung fehlgeschlagen.');
  process.exit(1);
}

console.log('Validierung erfolgreich.');
