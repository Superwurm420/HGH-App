import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const timetableDir = path.join(root, 'public/content/timetables');
const announcementDir = path.join(root, 'public/content/announcements');
const schoolHolidayFile = path.join(root, 'public/content/schulferien-nds.json');
const messagesFile = path.join(root, 'public/content/messages.json');

const timetablePattern = /^Stundenplan_kw_(\d{2})_Hj([12])_(\d{4})_(\d{2})\.pdf$/i;
const fallbackPattern = /(\d{4}).*?(\d{1,2})/;
const deDateTimePattern = /^\d{2}\.\d{2}\.\d{4} \d{2}:\d{2}$/;
const commentPrefixes = ['#', '//', ';'];
const classTokenPattern = /\b[A-Z]{1,3}\d{2}\b/g;
const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/;
const messageCategories = ['vorUnterricht', 'inPause', 'nachUnterricht', 'wochenende', 'feiertag', 'freierTag'];

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


function validateSchoolHolidays() {
  console.log('\n═══ Schulferien (Niedersachsen) ═══');

  if (!fs.existsSync(schoolHolidayFile)) {
    warn('Datei fehlt: public/content/schulferien-nds.json (Ferienlogik nutzt dann leere Liste).');
    return;
  }

  try {
    const raw = fs.readFileSync(schoolHolidayFile, 'utf8');
    const parsed = JSON.parse(raw);
    const ranges = Array.isArray(parsed?.ranges) ? parsed.ranges : [];

    for (const [idx, range] of ranges.entries()) {
      const start = range?.start;
      const end = range?.end;
      if (!isoDatePattern.test(start ?? '') || !isoDatePattern.test(end ?? '')) {
        fail(`schulferien-nds.json: ranges[${idx}] braucht start/end im Format YYYY-MM-DD.`);
        continue;
      }
      if (Date.parse(`${start}T00:00:00Z`) > Date.parse(`${end}T00:00:00Z`)) {
        fail(`schulferien-nds.json: ranges[${idx}] hat start nach end.`);
      }
    }

    console.log(`  OK: schulferien-nds.json (${ranges.length} Bereich(e))`);
  } catch (err) {
    fail(`schulferien-nds.json ist ungültig: ${err instanceof Error ? err.message : String(err)}`);
  }
}

function isStringArray(value) {
  return Array.isArray(value) && value.every((entry) => typeof entry === 'string');
}

function validateMessageContainer(container, pathLabel) {
  if (!container || typeof container !== 'object') {
    fail(`${pathLabel} fehlt oder ist kein Objekt.`);
    return;
  }

  for (const category of messageCategories) {
    const value = container[category];
    if (value === undefined) continue;
    if (!isStringArray(value)) {
      fail(`${pathLabel}.${category} muss eine Liste aus Texten sein.`);
    } else if (value.length === 0) {
      warn(`${pathLabel}.${category} ist leer.`);
    }
  }
}

function validateMessages() {
  console.log('\n═══ Tagesmeldungen ═══');

  if (!fs.existsSync(messagesFile)) {
    warn('Datei fehlt: public/content/messages.json (DailyMessage bleibt dann leer).');
    return;
  }

  try {
    const raw = fs.readFileSync(messagesFile, 'utf8');
    const parsed = JSON.parse(raw);

    validateMessageContainer(parsed?.standard, 'messages.standard');

    if (parsed?.klassen !== undefined) {
      if (!parsed.klassen || typeof parsed.klassen !== 'object' || Array.isArray(parsed.klassen)) {
        fail('messages.klassen muss ein Objekt mit Klassenschlüsseln sein.');
      } else {
        for (const [classKey, classMessages] of Object.entries(parsed.klassen)) {
          if (!/^[A-Z0-9]+$/i.test(classKey)) {
            warn(`messages.klassen[${classKey}] nutzt einen ungewöhnlichen Klassenschlüssel.`);
          }
          validateMessageContainer(classMessages, `messages.klassen.${classKey}`);
        }
      }
    }

    console.log('  OK: messages.json geprüft.');
  } catch (err) {
    fail(`messages.json ist ungültig: ${err instanceof Error ? err.message : String(err)}`);
  }
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

    // Nur fehlender Titel ist ein echter Fehler – alles andere wird still ignoriert.
    if (!headers.title) fail(`${file}: Feld 'title' fehlt (Eintrag hat keinen Titel).`);
    if (headers.date && !deDateTimePattern.test(headers.date)) {
      warn(`${file}: 'date' hat nicht das Format TT.MM.JJJJ HH:mm – Feld wird ignoriert.`);
    }
    if (headers.expires && !deDateTimePattern.test(headers.expires)) {
      warn(`${file}: 'expires' hat nicht das Format TT.MM.JJJJ HH:mm – gilt als dauerhaft.`);
    }
    if (!body) warn(`${file}: kein Text nach '---' gefunden.`);

    if (!hasError) console.log(`  OK: ${file}`);
  }
}

validateTimetables();
validateAnnouncements();
validateSchoolHolidays();
validateMessages();

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
