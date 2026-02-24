/**
 * Prebuild script – parses timetable PDFs and announcement TXT files
 * at build time so that the Next.js app only needs static JSON at runtime.
 *
 * Runs before `next build` (see package.json "build" script).
 *
 * PDF-Erkennung:
 * - Bevorzugtes Namensschema: Stundenplan_kw_XX_HjY_YYYY_YY.pdf
 * - Fallback: jede .pdf mit einer Jahreszahl im Namen wird erkannt
 * - Klassen werden dynamisch aus dem PDF-Header erkannt (nicht hardcodiert)
 * - Spaltenbreiten werden automatisch aus den erkannten Klassen-Positionen berechnet
 */

import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const TIMETABLE_DIR = path.join(ROOT, 'public/content/timetables');
const ANNOUNCEMENT_DIR = path.join(ROOT, 'public/content/announcements');
const OUTPUT_DIR = path.join(ROOT, 'src/data');

// ── Timetable filename parsing ──────────────────────────────────────────────

const FILENAME_PATTERN = /^Stundenplan_kw_(\d{2})_Hj([12])_(\d{4})_(\d{2})\.pdf$/i;
const FALLBACK_PATTERN = /(\d{4}).*?(\d{1,2})/;
const CLASS_PATTERN = /^[A-Z]{1,3}\d{2}$/;
const WEEKDAYS = ['MO', 'DI', 'MI', 'DO', 'FR'];
const DAY_SET = new Set(WEEKDAYS);

function parseTimetableFilename(filename) {
  const match = filename.match(FILENAME_PATTERN);
  if (match) {
    return {
      filename,
      kw: Number(match[1]),
      halfYear: Number(match[2]),
      yearStart: Number(match[3]),
      yearEndShort: Number(match[4]),
      href: `/content/timetables/${filename}`,
    };
  }

  // Fallback: Jede PDF mit Jahreszahl wird akzeptiert (z.B. "Plan_2025_KW10.pdf")
  const fallback = filename.match(FALLBACK_PATTERN);
  if (!fallback) return null;

  const yearStart = Number(fallback[1]);
  const kw = Math.min(53, Math.max(1, Number(fallback[2])));

  console.warn(`  WARNUNG: "${filename}" nutzt nicht das Standard-Namensschema. Fallback-Erkennung aktiv.`);

  return {
    filename,
    kw,
    halfYear: 2,
    yearStart,
    yearEndShort: (yearStart + 1) % 100,
    href: `/content/timetables/${filename}`,
    fallbackName: true,
  };
}

function compareTimetable(a, b) {
  // Bei Fallback-Dateien: zusätzlich nach Dateiänderungsdatum sortieren
  if (b.yearStart !== a.yearStart) return b.yearStart - a.yearStart;
  if (b.halfYear !== a.halfYear) return b.halfYear - a.halfYear;
  return b.kw - a.kw;
}

// ── PDF parsing ─────────────────────────────────────────────────────────────

async function loadPdfjs() {
  const paths = [
    'pdfjs-dist/legacy/build/pdf.mjs',
    'pdfjs-dist/build/pdf.mjs',
    'pdfjs-dist',
  ];
  for (const p of paths) {
    try {
      const mod = await import(p);
      if (mod.getDocument) return mod;
    } catch { /* try next */ }
  }
  throw new Error('Could not load pdfjs-dist – make sure it is installed.');
}

/**
 * Erkennt Klassen-Spalten dynamisch aus dem PDF-Header.
 * Scannt die oberen Zeilen nach Tokens die dem Klassenmuster entsprechen
 * (z.B. HT11, G21, GT01) und merkt sich deren X-Position.
 *
 * Gibt null zurück wenn keine Klassen erkannt werden konnten.
 */
function detectClassCenters(rows) {
  if (rows.length === 0) return null;

  const top = rows[0].y;
  // Suche im oberen Bereich der Seite (adaptiv: obere 15% oder mindestens 120pt)
  const pageHeight = top - (rows[rows.length - 1]?.y ?? 0);
  const headerThreshold = Math.max(120, pageHeight * 0.15);
  const headerRows = rows.filter((row) => row.y > top - headerThreshold);

  const classes = new Map();

  for (const row of headerRows) {
    for (const item of row.items) {
      const token = item.str.toUpperCase();
      if (!CLASS_PATTERN.test(token)) continue;
      // Klassen stehen nicht ganz links (da sind Tage/Zeiten)
      if (item.x < 80) continue;
      if (!classes.has(token)) classes.set(token, item.x);
    }
  }

  if (classes.size === 0) return null;

  return Object.fromEntries([...classes.entries()].sort((a, b) => a[1] - b[1]));
}

/**
 * Erkennt die X-Position, links derer Wochentage und Zeitangaben stehen.
 * Adaptiv: sucht nach dem ersten Wochentag-Token und nutzt dessen X als Referenz.
 */
function detectTimeColumnBoundary(rows) {
  for (const row of rows) {
    for (const item of row.items) {
      if (DAY_SET.has(item.str)) {
        // Wochentag gefunden – alles bis zum doppelten seiner X-Position
        // gehört zur Zeit-Spalte
        return Math.max(item.x + 60, 90);
      }
    }
  }
  return 105; // Fallback
}

/**
 * Berechnet die Spaltenbreite pro Klasse dynamisch anhand der Abstände
 * zwischen den erkannten Klassen-Positionen.
 */
function computeColumnBounds(classX) {
  const entries = Object.entries(classX).sort((a, b) => a[1] - b[1]);
  const bounds = {};

  for (let i = 0; i < entries.length; i++) {
    const [cls, x] = entries[i];
    const prevX = i > 0 ? entries[i - 1][1] : x - 80;
    const nextX = i < entries.length - 1 ? entries[i + 1][1] : x + 120;

    // Spaltengrenzen: Mitte zum Vorgänger bis Mitte zum Nachfolger
    const left = Math.round((prevX + x) / 2);
    const right = Math.round((x + nextX) / 2);
    bounds[cls] = { left, right, center: x };
  }

  return bounds;
}

async function parsePdf(filePath, getDocument) {
  const data = new Uint8Array(await fs.readFile(filePath));
  const doc = await getDocument({ data }).promise;
  const page = await doc.getPage(1);
  const content = await page.getTextContent();

  const items = content.items
    .map((item) => ({
      str: (item.str || '').trim(),
      x: item.transform?.[4] ?? 0,
      y: item.transform?.[5] ?? 0,
    }))
    .filter((item) => item.str)
    .sort((a, b) => b.y - a.y || a.x - b.x);

  // Group into rows (adaptiver Toleranzwert)
  const rows = [];
  for (const item of items) {
    const row = rows.find((r) => Math.abs(r.y - item.y) <= 2.5);
    if (row) row.items.push(item);
    else rows.push({ y: item.y, items: [item] });
  }
  rows.sort((a, b) => b.y - a.y);
  for (const row of rows) row.items.sort((a, b) => a.x - b.x);

  // Detect class columns dynamisch
  const classX = detectClassCenters(rows);
  if (!classX) {
    throw new Error('Keine Klassen im PDF-Header erkannt. PDF-Struktur möglicherweise anders als erwartet.');
  }

  const classes = Object.keys(classX);
  const columnBounds = computeColumnBounds(classX);
  const timeColBoundary = detectTimeColumnBoundary(rows);

  const out = Object.fromEntries(
    classes.map((cls) => [cls, { MO: [], DI: [], MI: [], DO: [], FR: [] }]),
  );

  // Dynamische Spalten-Zuordnung statt fester Offsets
  const cellText = (row, cls) => {
    const { left, right } = columnBounds[cls];
    return row.items
      .filter((i) => i.x >= left && i.x < right)
      .map((i) => i.str)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
  };

  let day = null;
  const lastByClass = {};

  for (const row of rows) {
    // Tage-Erkennung: adaptiv über timeColBoundary
    const dayToken = row.items.find(
      (i) => i.x < timeColBoundary && DAY_SET.has(i.str),
    )?.str;
    if (dayToken) {
      day = dayToken;
      for (const cls of classes) delete lastByClass[cls];
    }
    if (!day) continue;

    // Zeitangaben: alles links der Klassen-Spalten
    const left = row.items
      .filter((i) => i.x < timeColBoundary)
      .map((i) => i.str)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
    const lessonMatch = left.match(/^(\d+)\.\s*(\d{1,2}[.:]\d{2}\s*-\s*\d{1,2}[.:]\d{2})/);

    if (lessonMatch) {
      const period = Number(lessonMatch[1]);
      const time = lessonMatch[2];
      for (const cls of classes) {
        const subject = cellText(row, cls);
        const entry = { period, time, subject: subject || undefined };
        out[cls][day].push(entry);
        lastByClass[cls] = entry;
      }
      continue;
    }

    if (row.items.some((i) => i.x < timeColBoundary && i.str.includes('Mittagspause'))) continue;

    for (const cls of classes) {
      const detail = cellText(row, cls);
      if (!detail || !lastByClass[cls]) continue;
      lastByClass[cls].detail = lastByClass[cls].detail
        ? `${lastByClass[cls].detail} · ${detail}`
        : detail;
    }
  }

  // Filter empty / placeholder entries
  for (const cls of classes) {
    for (const d of WEEKDAYS) {
      out[cls][d] = out[cls][d].filter((l) => l.subject && l.subject !== 'R');
    }
  }

  return out;
}

/**
 * Erstellt eine Diagnose-Zusammenfassung für ein geparsten Stundenplan.
 */
function diagnoseParsedSchedule(filename, schedule) {
  const classes = Object.keys(schedule);
  const lessonCounts = {};
  let totalLessons = 0;
  const emptyDays = [];

  for (const cls of classes) {
    let count = 0;
    for (const day of WEEKDAYS) {
      const lessons = schedule[cls][day];
      count += lessons.length;
      if (lessons.length === 0) emptyDays.push(`${cls}/${day}`);
    }
    lessonCounts[cls] = count;
    totalLessons += count;
  }

  return { classes, lessonCounts, totalLessons, emptyDays };
}

// ── Announcement parsing ────────────────────────────────────────────────────

const DE_DATE = /^\d{2}\.\d{2}\.\d{4} \d{2}:\d{2}$/;

function parseAnnouncement(raw, file) {
  const [headerRaw, ...bodyParts] = raw.split('\n---\n');
  const body = bodyParts.join('\n---\n').trim();
  const headers = {};
  const warnings = [];

  for (const line of headerRaw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || !trimmed.includes(':')) continue;
    const idx = trimmed.indexOf(':');
    headers[trimmed.slice(0, idx).trim().toLowerCase()] = trimmed.slice(idx + 1).trim();
  }

  if (!headers.title) warnings.push("Pflichtfeld 'title' fehlt.");
  if (!headers.date) warnings.push("Pflichtfeld 'date' fehlt.");
  if (headers.date && !DE_DATE.test(headers.date))
    warnings.push("'date' hat nicht das Format TT.MM.JJJJ HH:mm.");
  if (headers.expires && !DE_DATE.test(headers.expires))
    warnings.push("'expires' hat nicht das Format TT.MM.JJJJ HH:mm.");
  if (!body) warnings.push('Kein Text nach der Trennlinie gefunden.');

  return {
    file,
    title: headers.title,
    date: headers.date,
    audience: headers.audience,
    expires: headers.expires,
    body,
    warnings,
  };
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  // ── Timetables ──
  console.log('\n═══ Stundenplan-PDFs ═══');
  let timetableFiles = [];
  try {
    timetableFiles = (await fs.readdir(TIMETABLE_DIR)).filter((f) =>
      f.toLowerCase().endsWith('.pdf'),
    );
  } catch {
    console.warn('  Ordner public/content/timetables/ nicht gefunden – überspringe PDF-Parsing.');
  }

  if (timetableFiles.length === 0) {
    console.warn('  Keine PDF-Dateien gefunden.');
  } else {
    console.log(`  ${timetableFiles.length} PDF(s) gefunden: ${timetableFiles.join(', ')}`);
  }

  const metas = timetableFiles.map(parseTimetableFilename).filter(Boolean);
  const unrecognized = timetableFiles.filter(
    (f) => !metas.some((m) => m.filename === f),
  );
  if (unrecognized.length > 0) {
    console.warn(`  WARNUNG: Nicht erkannte Dateien (übersprungen): ${unrecognized.join(', ')}`);
  }

  metas.sort(compareTimetable);

  if (metas.length > 0) {
    console.log(`  Neueste nach Sortierung: ${metas[0].filename}`);
  }

  const schedules = {};
  const diagnostics = [];

  if (metas.length > 0) {
    const pdfjsLib = await loadPdfjs();
    const { getDocument } = pdfjsLib;

    for (const meta of metas) {
      try {
        console.log(`  Parsing ${meta.filename}...`);
        const parsed = await parsePdf(
          path.join(TIMETABLE_DIR, meta.filename),
          getDocument,
        );
        schedules[meta.filename] = parsed;

        // Diagnose
        const diag = diagnoseParsedSchedule(meta.filename, parsed);
        diagnostics.push(diag);
        console.log(`    Klassen: ${diag.classes.join(', ')}`);
        console.log(`    Stunden gesamt: ${diag.totalLessons}`);
        for (const [cls, count] of Object.entries(diag.lessonCounts)) {
          if (count === 0) console.warn(`    WARNUNG: ${cls} hat 0 Stunden – PDF-Struktur prüfen!`);
        }
        if (diag.totalLessons === 0) {
          console.error(`    FEHLER: Keine einzige Stunde erkannt in ${meta.filename}!`);
        }
      } catch (err) {
        console.error(`  FEHLER beim Parsen von ${meta.filename}: ${err.message}`);
      }
    }
  }

  const timetableData = { files: metas, schedules };
  await fs.writeFile(
    path.join(OUTPUT_DIR, 'timetable-data.json'),
    JSON.stringify(timetableData, null, 2),
  );
  console.log(`  → timetable-data.json geschrieben (${metas.length} Dateien, ${Object.keys(schedules).length} erfolgreich geparst)`);

  // ── Announcements ──
  console.log('\n═══ Pinnwand/Ankündigungen ═══');
  let announcementFiles = [];
  try {
    announcementFiles = (await fs.readdir(ANNOUNCEMENT_DIR)).filter((f) =>
      f.toLowerCase().endsWith('.txt'),
    );
  } catch {
    console.warn('  Ordner public/content/announcements/ nicht gefunden – überspringe.');
  }

  const announcements = [];
  for (const file of announcementFiles) {
    const raw = await fs.readFile(path.join(ANNOUNCEMENT_DIR, file), 'utf8');
    const parsed = parseAnnouncement(raw, file);
    announcements.push(parsed);
    if (parsed.warnings.length > 0) {
      console.warn(`  WARNUNG in ${file}: ${parsed.warnings.join('; ')}`);
    }
  }

  await fs.writeFile(
    path.join(OUTPUT_DIR, 'announcements-data.json'),
    JSON.stringify(announcements, null, 2),
  );
  console.log(`  → announcements-data.json geschrieben (${announcements.length} Dateien)`);

  // ── Zusammenfassung ──
  console.log('\n═══ Zusammenfassung ═══');
  console.log(`  PDFs erkannt: ${metas.length}/${timetableFiles.length}`);
  console.log(`  PDFs erfolgreich geparst: ${Object.keys(schedules).length}/${metas.length}`);
  console.log(`  Ankündigungen: ${announcements.length}`);
  if (metas.length > 0) {
    console.log(`  Aktiver Stundenplan: ${metas[0].filename} (KW ${metas[0].kw})`);
  }
  console.log('  Prebuild abgeschlossen.\n');
}

main().catch((err) => {
  console.error('Prebuild fehlgeschlagen:', err);
  process.exit(1);
});
