import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const announcementDir = path.join(root, 'public/content/announcements');
const storeDir = path.join(root, 'data');
const storePath = path.join(storeDir, 'announcements-store.json');

function ensureStore() {
  if (!fs.existsSync(storeDir)) {
    fs.mkdirSync(storeDir, { recursive: true });
  }

  if (!fs.existsSync(storePath)) {
    fs.writeFileSync(storePath, `${JSON.stringify({ version: 1, announcements: [] }, null, 2)}\n`, 'utf8');
  }
}

function readStore() {
  ensureStore();
  try {
    const raw = fs.readFileSync(storePath, 'utf8');
    const parsed = JSON.parse(raw);
    if (parsed?.version !== 1 || !Array.isArray(parsed?.announcements)) {
      return { version: 1, announcements: [] };
    }
    return parsed;
  } catch {
    return { version: 1, announcements: [] };
  }
}

function writeStore(payload) {
  fs.writeFileSync(storePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

function isCommentLine(line) {
  return ['#', '//', ';'].some((prefix) => line.startsWith(prefix));
}

function parseAnnouncementTxt(raw) {
  const [headerRaw, ...bodyParts] = raw.split('\n---\n');
  const body = bodyParts.join('\n---\n').trim();
  const headers = {};

  for (const line of headerRaw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || isCommentLine(trimmed) || !trimmed.includes(':')) continue;
    const idx = trimmed.indexOf(':');
    headers[trimmed.slice(0, idx).trim().toLowerCase()] = trimmed.slice(idx + 1).trim();
  }

  return {
    title: headers.title ?? '',
    date: headers.date ?? '',
    expires: headers.expires ?? '',
    audience: headers.audience ?? 'alle',
    classes: headers.classes ?? '',
    anzeige: (headers.anzeige ?? 'nein').toLowerCase() === 'ja' ? 'ja' : 'nein',
    body,
  };
}

function normalizeClasses(value) {
  return [...new Set(value.split(/[;,/|\s]+/).map((item) => item.trim()).filter(Boolean))];
}

function toIdFromFile(file) {
  return file.replace(/\.txt$/i, '');
}

function migrate() {
  if (!fs.existsSync(announcementDir)) {
    console.log('Kein announcements-Ordner vorhanden, nichts zu migrieren.');
    return;
  }

  const txtFiles = fs.readdirSync(announcementDir).filter((file) => file.toLowerCase().endsWith('.txt')).sort();
  if (txtFiles.length === 0) {
    console.log('Keine TXT-Dateien gefunden, nichts zu migrieren.');
    return;
  }

  const store = readStore();
  const existingIds = new Set(store.announcements.map((entry) => entry.id));

  let imported = 0;
  for (const file of txtFiles) {
    const id = toIdFromFile(file);
    if (existingIds.has(id)) {
      console.log(`Übersprungen (bereits vorhanden): ${file}`);
      continue;
    }

    const fullPath = path.join(announcementDir, file);
    const raw = fs.readFileSync(fullPath, 'utf8');
    const parsed = parseAnnouncementTxt(raw);
    const stat = fs.statSync(fullPath);
    const createdAt = stat.birthtime instanceof Date && !Number.isNaN(stat.birthtime.getTime()) ? stat.birthtime.toISOString() : stat.mtime.toISOString();
    const updatedAt = stat.mtime.toISOString();

    store.announcements.push({
      id,
      title: parsed.title,
      date: parsed.date,
      audience: parsed.audience || 'alle',
      classes: normalizeClasses(parsed.classes),
      expires: parsed.expires,
      anzeige: parsed.anzeige,
      highlight: parsed.anzeige === 'ja',
      body: parsed.body,
      createdAt,
      updatedAt,
    });
    imported++;
  }

  writeStore(store);
  console.log(`Migration abgeschlossen. Importiert: ${imported}, Gesamt im Store: ${store.announcements.length}`);
  console.log(`Store-Datei: ${storePath}`);
}

migrate();
