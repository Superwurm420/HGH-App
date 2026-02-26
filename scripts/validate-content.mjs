import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const timetableDir = path.join(root, 'public/content/timetables');
const announcementDir = path.join(root, 'public/content/announcements');

const timetablePattern = /^Stundenplan_kw_(\d{2})_Hj([12])_(\d{4})_(\d{2})\.pdf$/i;
const fallbackPattern = /(\d{4}).*?(\d{1,2})/;
const deDateTimePattern = /^\d{2}\.\d{2}\.\d{4} \d{2}:\d{2}$/;
const commentPrefixes = ['#', '//', ';'];

let hasError = false;
let hasWarning = false;

function warn(msg) {
  hasWarning = true;
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
  console.log('═══ Stundenplan-PDFs ═══');
  const files = readDirSafe(timetableDir).filter((f) => f.toLowerCase().endsWith('.pdf'));
  if (files.length === 0) {
    warn('Keine PDF in public/content/timetables gefunden.');
    return;
  }

  console.log(`  ${files.length} PDF(s) gefunden.`);

  let standardCount = 0;
  let fallbackCount = 0;

  for (const file of files) {
    const m = file.match(timetablePattern);
    if (m) {
      const kw = Number(m[1]);
      if (kw < 1 || kw > 53) fail(`KW außerhalb Bereich 01-53: ${file}`);
      else {
        standardCount++;
        console.log(`  OK: ${file}`);
      }
      continue;
    }

    // Fallback: Datei mit Jahreszahl im Namen wird akzeptiert (mit Warnung)
    const fb = file.match(fallbackPattern);
    if (fb) {
      fallbackCount++;
      warn(`"${file}" nutzt nicht das Standard-Schema Stundenplan_kw_XX_HjY_YYYY_YY.pdf – wird trotzdem erkannt (Fallback).`);
      continue;
    }

    // Weder Standard noch Fallback
    warn(`"${file}" kann nicht zugeordnet werden (kein erkennbares Namensschema). Wird beim Build übersprungen.`);
  }

  console.log(`  Standard-Schema: ${standardCount}, Fallback: ${fallbackCount}`);
}

function isCommentLine(line) {
  return commentPrefixes.some((prefix) => line.startsWith(prefix));
}

function isValidBooleanFlag(value) {
  if (!value) return true;
  return ['true', '1', 'ja', 'yes', 'y', 'false', '0', 'nein', 'no', 'n']
    .includes(value.trim().toLowerCase());
}

function parseAnnouncement(raw) {
  const [headerRaw, ...bodyParts] = raw.split('\n---\n');
  const body = bodyParts.join('\n---\n').trim();
  const headers = {};

  for (const line of headerRaw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || isCommentLine(trimmed) || !trimmed.includes(':')) continue;
    const idx = trimmed.indexOf(':');
    const key = trimmed.slice(0, idx).trim().toLowerCase();
    const value = trimmed.slice(idx + 1).trim();
    headers[key] = value;
  }

  return { headers, body };
}

function validateAnnouncements() {
  console.log('\n═══ Pinnwand/Ankündigungen ═══');
  const files = readDirSafe(announcementDir).filter((f) => f.toLowerCase().endsWith('.txt'));
  if (files.length === 0) {
    warn('Keine TXT in public/content/announcements gefunden.');
    return;
  }

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
    if (!isValidBooleanFlag(headers.highlight)) {
      fail(`${file}: 'highlight' muss true/false, ja/nein oder 1/0 sein.`);
    }
    if (!body) warn(`${file}: kein Text nach '---' gefunden.`);

    if (!hasError) console.log(`  OK: ${file}`);
  }
}

validateTimetables();
validateAnnouncements();

console.log('\n═══ Ergebnis ═══');
if (hasError) {
  console.error('Validierung fehlgeschlagen (Fehler gefunden).');
  process.exit(1);
}
if (hasWarning) {
  console.log('Validierung bestanden mit Warnungen (siehe oben).');
} else {
  console.log('Validierung erfolgreich – alles in Ordnung.');
}
