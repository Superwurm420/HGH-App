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
const OUTPUT_DIR = path.join(ROOT, 'src/generated');

// ── Timetable filename parsing ──────────────────────────────────────────────

const FILENAME_PATTERN = /^Stundenplan_kw_(\d{2})_Hj([12])_(\d{4})_(\d{2})\.pdf$/i;
const FALLBACK_PATTERN = /(\d{4})(?:\D{0,4}(\d{1,2}))?/;
const CLASS_PATTERN = /^[A-Z]{1,3}\s?\d{2}$/;
const WEEKDAYS = ['MO', 'DI', 'MI', 'DO', 'FR'];
const DAY_SET = new Set(WEEKDAYS);

function parseTimetableFilename(filename, stat) {
  const match = filename.match(FILENAME_PATTERN);
  if (match) {
    return {
      filename,
      kw: Number(match[1]),
      halfYear: Number(match[2]),
      yearStart: Number(match[3]),
      yearEndShort: Number(match[4]),
      href: `/content/timetables/${filename}`,
      source: 'name-pattern',
      lastModifiedMs: stat?.mtimeMs,
    };
  }

  // Fallback: Jede PDF mit Jahreszahl wird akzeptiert (z.B. "Plan_2025_KW10.pdf")
  const fallback = filename.match(FALLBACK_PATTERN);
  if (!fallback && !stat) return null;

  const fallbackYear = fallback ? Number(fallback[1]) : null;
  const fallbackKw = fallback?.[2] ? Number(fallback[2]) : Number.NaN;
  const hasMtime = typeof stat?.mtimeMs === 'number';
  const mtimeYear = hasMtime ? new Date(stat.mtimeMs).getUTCFullYear() : null;
  const yearStart = fallbackYear ?? mtimeYear;
  if (!yearStart) return null;

  const kw = Number.isFinite(fallbackKw)
    ? Math.min(53, Math.max(1, fallbackKw))
    : 53;

  console.warn(`  WARNUNG: "${filename}" nutzt nicht das Standard-Namensschema. Fallback-Erkennung aktiv.`);

  return {
    filename,
    kw,
    halfYear: 2,
    yearStart,
    yearEndShort: (yearStart + 1) % 100,
    href: `/content/timetables/${filename}`,
    source: fallback ? 'name-fallback' : 'file-mtime',
    lastModifiedMs: stat?.mtimeMs,
  };
}

function compareTimetable(a, b) {
  const aMtime = a.lastModifiedMs ?? 0;
  const bMtime = b.lastModifiedMs ?? 0;
  if (b.yearStart !== a.yearStart) return b.yearStart - a.yearStart;
  if (b.halfYear !== a.halfYear) return b.halfYear - a.halfYear;
  if (b.kw !== a.kw) return b.kw - a.kw;
  if (bMtime !== aMtime) return bMtime - aMtime;
  return a.filename.localeCompare(b.filename, 'de');
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
      if (!CLASS_PATTERN.test(item.str.toUpperCase())) continue;
      // Normalize: "GT 01" → "GT01"
      const token = item.str.toUpperCase().replace(/\s+/g, '');
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
 * Nutzt 65 % der ersten Klassen-X-Position als robust skalierende Grenze,
 * sodass sowohl schmale als auch breite PDF-Layouts korrekt erkannt werden.
 */
function detectTimeColumnBoundary(classX) {
  const firstClassX = Object.values(classX)[0];
  return Math.max(Math.round(firstClassX * 0.65), 85);
}

/**
 * Erkennt die X-Positionen der Raum-Spalten ("R") im PDF-Header.
 * Im PDF steht nach jeder Klassen-Spalte eine schmale "R"-Spalte mit
 * Raumnummern. Diese Funktion ordnet jede R-Position der Klasse zu,
 * deren Zentrum links davon liegt.
 * Gibt null zurück wenn keine Raum-Spalten erkannt werden.
 */
function detectRoomColumns(rows, classX, timeColBoundary) {
  if (rows.length === 0) return null;
  const top = rows[0].y;
  const pageHeight = top - (rows[rows.length - 1]?.y ?? 0);
  const headerThreshold = Math.max(120, pageHeight * 0.15);
  const headerRows = rows.filter((row) => row.y > top - headerThreshold);

  const rPositions = [];
  for (const row of headerRows) {
    for (const item of row.items) {
      if (item.str === 'R' && item.x >= timeColBoundary) {
        rPositions.push(item.x);
      }
    }
  }
  if (rPositions.length === 0) return null;
  rPositions.sort((a, b) => a - b);

  const classEntries = Object.entries(classX).sort((a, b) => a[1] - b[1]);
  const roomCols = {};
  for (const rx of rPositions) {
    let best = null;
    for (const [cls, cx] of classEntries) {
      if (cx <= rx) best = cls;
    }
    if (best && !roomCols[best]) {
      roomCols[best] = rx;
    }
  }

  return Object.keys(roomCols).length > 0 ? roomCols : null;
}

/**
 * Berechnet die Spaltenbreite pro Klasse dynamisch anhand der erkannten
 * Klassen-Positionen und optional der Raum-Spalten ("R") aus dem Header.
 * Die erste Klassen-Spalte beginnt an der timeColBoundary.
 *
 * Wenn Raum-Spalten erkannt wurden, wird die Grenze zwischen zwei Klassen
 * hinter die R-Spalte der linken Klasse gesetzt, damit Raumnummern
 * korrekt der zugehörigen Klasse zugeordnet werden.
 */
function computeColumnBounds(classX, timeColBoundary, roomColumns) {
  const entries = Object.entries(classX).sort((a, b) => a[1] - b[1]);
  const bounds = {};
  // Small margin past room column to include room values but exclude next class
  const ROOM_COL_MARGIN = 5;

  for (let i = 0; i < entries.length; i++) {
    const [cls, x] = entries[i];
    const nextX = i < entries.length - 1 ? entries[i + 1][1] : null;
    const prevEntry = i > 0 ? entries[i - 1] : null;

    // Left boundary
    let left;
    if (i === 0) {
      left = timeColBoundary;
    } else {
      const prevRoomX = roomColumns?.[prevEntry[0]];
      if (prevRoomX != null) {
        left = Math.round(prevRoomX) + ROOM_COL_MARGIN;
      } else {
        left = Math.round((prevEntry[1] + x) / 2);
      }
    }

    // Right boundary
    let right;
    const roomX = roomColumns?.[cls];
    if (roomX != null && nextX != null) {
      right = Math.round(roomX) + ROOM_COL_MARGIN;
    } else if (roomX != null) {
      // Last class: extend generously past room column
      right = Math.round(roomX) + 30;
    } else if (nextX != null) {
      right = Math.round((x + nextX) / 2);
    } else {
      right = Math.round(x + 120);
    }

    bounds[cls] = { left, right, center: x };
  }

  return bounds;
}

async function parsePdf(filePath, getDocument) {
  const data = new Uint8Array(await fs.readFile(filePath));
  const verbosity = pdfjsLib?.VerbosityLevel?.ERRORS ?? 0;
  const doc = await getDocument({ data, verbosity }).promise;
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
  const timeColBoundary = detectTimeColumnBoundary(classX);
  const roomColumns = detectRoomColumns(rows, classX, timeColBoundary);
  const columnBounds = computeColumnBounds(classX, timeColBoundary, roomColumns);

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

  // ── Pre-scan: detect day boundaries ──────────────────────────────
  // Day labels (MO, DI, …) appear at period 6, NOT at period 1.
  // Find each "period 1" row and the day marker within that section.
  const period1Ys = [];
  for (const row of rows) {
    const leftItems = row.items.filter((i) => i.x < timeColBoundary);
    const hasPeriod1 = leftItems.some((i) => i.str === '1.');
    const hasEightOClock = leftItems.some((i) => /8[.:]00/.test(i.str));
    if (hasPeriod1 && hasEightOClock) period1Ys.push(row.y);
  }
  period1Ys.sort((a, b) => b.y - a.y);

  const daySections = period1Ys.map((startY, i) => {
    const endY = i < period1Ys.length - 1
      ? period1Ys[i + 1] + 3
      : -Infinity;
    return { startY, endY, day: null };
  });

  for (const row of rows) {
    const dayToken = row.items.find((i) => i.x < timeColBoundary && DAY_SET.has(i.str))?.str;
    if (!dayToken) continue;
    for (const sec of daySections) {
      if (row.y <= sec.startY + 5 && row.y > sec.endY) {
        if (!sec.day) sec.day = dayToken;
        break;
      }
    }
  }
  for (let i = 0; i < daySections.length; i++) {
    if (!daySections[i].day) daySections[i].day = WEEKDAYS[i];
  }

  function getDayForY(y) {
    for (const sec of daySections) {
      if (y <= sec.startY + 5 && y > sec.endY) return sec.day;
    }
    return null;
  }

  // Helper: is a string an Excel error / empty marker?
  function isNoValue(s) {
    return !s || s === '#NV' || s === '#N/A' || s === '#WERT!' || s === '#REF!';
  }

  // Helper: is a cell value a room number?
  const ROOM_RE = /^(\d{1,2}|#NV|#N\/A|BS)(\s*\/?\s*(\d{1,2}|#NV|BS))*$/i;
  function isRoomValue(s) { return ROOM_RE.test(s); }

  const lastByClass = {};

  for (const row of rows) {
    const day = getDayForY(row.y);
    if (!day) continue;

    if (row.items.some((i) => i.x < timeColBoundary && i.str.includes('Mittagspause'))) continue;

    // Strip day label from left-column text so period-6 rows match the regex
    let left = row.items
      .filter((i) => i.x < timeColBoundary)
      .map((i) => i.str)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
    for (const wd of WEEKDAYS) {
      if (left.startsWith(wd + ' ')) { left = left.slice(wd.length).trim(); break; }
    }
    const lessonMatch = left.match(/^(\d{1,2})\.\s*(\d{1,2}[.:]\d{2}\s*-\s*\d{1,2}[.:]\d{2})/);

    if (lessonMatch) {
      const period = Number(lessonMatch[1]);
      const time = lessonMatch[2];
      for (const cls of classes) {
        const subject = cellText(row, cls);
        const entry = { period, time, subject: subject || undefined };
        out[cls][day].push(entry);
        lastByClass[`${cls}:${day}`] = entry;
      }
      continue;
    }

    // Non-period row: classify each cell individually
    for (const cls of classes) {
      const val = cellText(row, cls);
      const key = `${cls}:${day}`;
      if (!val || isNoValue(val) || !lastByClass[key]) continue;

      if (isRoomValue(val)) {
        lastByClass[key].room = val;
      } else {
        lastByClass[key].detail = lastByClass[key].detail
          ? `${lastByClass[key].detail} · ${val}`
          : val;
      }
    }
  }

  // ── Post-process ─────────────────────────────────────────────────
  const classSet = new Set(classes.map((c) => c.toUpperCase()));
  // Matches standalone time ranges like "9.50 - 13.10 Uhr" that were misidentified as subjects
  const TIME_RANGE_SUBJECT = /^\d{1,2}[.:]\d{2}\s*-\s*\d{1,2}[.:]\d{2}/;

  for (const cls of classes) {
    for (const d of WEEKDAYS) {
      // Remove entries with no subject, 'R' headers, #NV-only subjects,
      // class names as subjects, or time ranges as subjects
      let filtered = out[cls][d].filter((l) => {
        if (!l.subject || l.subject === 'R' || isNoValue(l.subject)) return false;
        if (classSet.has(l.subject.toUpperCase().replace(/\s+/g, ''))) return false;
        if (TIME_RANGE_SUBJECT.test(l.subject)) return false;
        return true;
      });
      // Clean #NV from room fields
      for (const l of filtered) {
        if (l.detail && isNoValue(l.detail)) delete l.detail;
        if (l.room) {
          const cleaned = l.room.replace(/#(NV|N\/A|WERT!|REF!)/gi, '').replace(/\s+/g, ' ').trim();
          if (cleaned) l.room = cleaned;
          else delete l.room;
        }
      }
      // Sort by period, then merge Doppelstunden
      filtered.sort((a, b) => a.period - b.period);
      out[cls][d] = mergePeriodPairs(filtered);
    }
  }

  return out;
}

/**
 * Zusammenführen von Doppelstunden:
 * Im PDF wechseln sich Unterrichtsstunden und Lehrerkürzel ab (1=Fach, 2=Kürzel, 3=Fach, 4=Kürzel …).
 * Diese Funktion mergt aufeinanderfolgende Paare (1+2, 3+4, …) so dass
 * das Lehrerkürzel als Detail der ersten Stunde erscheint.
 */
function mergePeriodPairs(lessons) {
  if (lessons.length === 0) return [];

  const sorted = [...lessons].sort((a, b) => a.period - b.period);
  const result = [];
  let i = 0;

  while (i < sorted.length) {
    const curr = sorted[i];
    const next = sorted[i + 1];

    // Merge wenn: curr ist ungerade Stunde UND next ist curr+1
    const isOdd = curr.period % 2 === 1;
    const isConsecutive = next && next.period === curr.period + 1;

    if (isOdd && isConsecutive) {
      const teacherKuerzel = (next.subject ?? '').trim();
      const existingDetail = (curr.detail ?? '').trim();
      const mergedDetail = teacherKuerzel
        ? existingDetail ? `${teacherKuerzel} · ${existingDetail}` : teacherKuerzel
        : existingDetail || undefined;

      const mergedRoom = curr.room || next.room;

      result.push({
        period: curr.period,
        periodEnd: next.period,
        time: mergeTimeRange(curr.time, next.time),
        subject: curr.subject,
        detail: mergedDetail || undefined,
        ...(mergedRoom ? { room: mergedRoom } : {}),
      });
      i += 2;
    } else {
      result.push(curr);
      i++;
    }
  }

  return result;
}

/** Verbindet den Start von time1 mit dem Ende von time2: "8.30 - 9.15" + "9.15 - 10.00" → "8.30 - 10.00" */
function mergeTimeRange(time1, time2) {
  const startMatch = time1.match(/^(\d{1,2}[.:]\d{2})/);
  const endMatch = time2.match(/(\d{1,2}[.:]\d{2})\s*$/);
  if (startMatch && endMatch) {
    return `${startMatch[1]} - ${endMatch[1]}`;
  }
  return time1;
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
const COMMENT_PREFIXES = ['#', '//', ';'];

function isCommentLine(line) {
  return COMMENT_PREFIXES.some((prefix) => line.startsWith(prefix));
}

function parseBooleanFlag(value) {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  if (['true', '1', 'ja', 'yes', 'y'].includes(normalized)) return true;
  if (['false', '0', 'nein', 'no', 'n'].includes(normalized)) return false;
  return null;
}

function parseAnnouncement(raw, file) {
  const [headerRaw, ...bodyParts] = raw.split('\n---\n');
  const body = bodyParts.join('\n---\n').trim();
  const headers = {};
  const warnings = [];

  for (const line of headerRaw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || isCommentLine(trimmed) || !trimmed.includes(':')) continue;
    const idx = trimmed.indexOf(':');
    headers[trimmed.slice(0, idx).trim().toLowerCase()] = trimmed.slice(idx + 1).trim();
  }

  const highlight = parseBooleanFlag(headers.highlight);

  if (!headers.title) warnings.push("Pflichtfeld 'title' fehlt.");
  if (!headers.date) warnings.push("Pflichtfeld 'date' fehlt.");
  if (headers.date && !DE_DATE.test(headers.date))
    warnings.push("'date' hat nicht das Format TT.MM.JJJJ HH:mm.");
  if (headers.expires && !DE_DATE.test(headers.expires))
    warnings.push("'expires' hat nicht das Format TT.MM.JJJJ HH:mm.");
  if (highlight === null)
    warnings.push("'highlight' muss true/false, ja/nein oder 1/0 sein.");
  if (!body) warnings.push('Kein Text nach der Trennlinie gefunden.');

  return {
    file,
    title: headers.title,
    date: headers.date,
    audience: headers.audience,
    classes: headers.classes,
    expires: headers.expires,
    highlight: highlight ?? false,
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

  const fileStats = await Promise.all(
    timetableFiles.map(async (filename) => {
      const fullPath = path.join(TIMETABLE_DIR, filename);
      const stat = await fs.stat(fullPath);
      return { filename, stat };
    }),
  );

  const metas = fileStats
    .map(({ filename, stat }) => parseTimetableFilename(filename, stat))
    .filter(Boolean);
  const unrecognized = fileStats.map((entry) => entry.filename).filter(
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
          console.error(`    [TT_PARSE_EMPTY] Keine einzige Stunde erkannt in ${meta.filename}.`);
        }
      } catch (err) {
        console.error(`  [TT_PARSE_FAILED] ${meta.filename}: ${err.message}`);
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

  // ── Kalender-URLs ──
  console.log('\n═══ Kalender ═══');
  let calendarUrls = [];
  try {
    const calendarTxt = await fs.readFile(path.join(ROOT, 'public/content/kalender.txt'), 'utf8');
    calendarUrls = calendarTxt
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.startsWith('http'));
    console.log(`  ${calendarUrls.length} Kalender-URL(s) gefunden.`);
  } catch {
    console.log('  Keine kalender.txt gefunden – überspringe.');
  }
  await fs.writeFile(
    path.join(OUTPUT_DIR, 'calendar-data.json'),
    JSON.stringify({ urls: calendarUrls }, null, 2),
  );
  console.log('  → calendar-data.json geschrieben.');

  // ── Tägliche Meldungen ──
  console.log('\n═══ Tägliche Meldungen ═══');
  let messages = {};
  try {
    const messagesRaw = await fs.readFile(path.join(ROOT, 'public/content/messages.json'), 'utf8');
    messages = JSON.parse(messagesRaw);
    console.log('  messages.json geladen.');
  } catch {
    console.log('  Keine messages.json gefunden – überspringe.');
  }
  await fs.writeFile(
    path.join(OUTPUT_DIR, 'messages-data.json'),
    JSON.stringify(messages, null, 2),
  );
  console.log('  → messages-data.json geschrieben.');

  // ── Service Worker generieren ──
  console.log('\n═══ Service Worker ═══');
  const buildVersion = new Date().toISOString().replace(/[:.]/g, '-');
  const swSource = `// Automatisch generiert von scripts/prebuild.mjs – NICHT manuell bearbeiten!
// BUILD_VERSION wird bei jedem Build neu gesetzt, damit der Browser Updates erkennt.
const BUILD_VERSION = '${buildVersion}';
const CACHE = 'hgh-pwa-v3-' + BUILD_VERSION;

// HTML-Routen: network-first (immer frische Inhalte wenn online)
const HTML_ROUTES = ['/', '/stundenplan', '/woche', '/weiteres', '/pinnwand', '/einstellungen'];
const HTML_SET = new Set(HTML_ROUTES);

// ── Install: Kern-Routen precachen ──────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(HTML_ROUTES))
  );
  // Sofort aktivieren, ohne auf das Schließen aller Tabs zu warten
  self.skipWaiting();
});

// ── Activate: Alte Caches aufräumen, Navigation Preload, sofort Kontrolle ────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      caches.keys().then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE)
            .map((key) => caches.delete(key))
        )
      ),
      // Navigation Preload: HTML-Request startet parallel zum SW-Boot
      self.registration.navigationPreload
        ? self.registration.navigationPreload.enable()
        : Promise.resolve(),
    ])
  );
  // Alle offenen Tabs sofort übernehmen (kein erneutes Laden nötig)
  self.clients.claim();
});

// ── Fetch ────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Nur Same-Origin-Requests behandeln
  if (url.origin !== self.location.origin) return;

  const isHtml = HTML_SET.has(url.pathname);
  const isApi = url.pathname.startsWith('/api/');

  if (isApi) {
    event.respondWith(fetch(event.request));
    return;
  }

  if (isHtml) {
    // Network-first für HTML: immer frische Inhalte, Cache als Fallback offline.
    // Navigation Preload wird genutzt falls verfügbar (parallel zum SW-Boot).
    event.respondWith(
      (async () => {
        try {
          const preloaded = await event.preloadResponse;
          const response = preloaded || await fetch(event.request);
          const clone = response.clone();
          caches.open(CACHE).then((cache) => cache.put(event.request, clone));
          return response;
        } catch {
          const cached = await caches.match(event.request);
          return cached || caches.match('/');
        }
      })()
    );
  } else {
    // Cache-first für statische Assets (JS/CSS mit Hash-URL, Bilder etc.)
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          const clone = response.clone();
          caches.open(CACHE).then((cache) => cache.put(event.request, clone));
          return response;
        });
      })
    );
  }
});
`;
  const swPath = path.join(ROOT, 'public/sw.js');
  await fs.writeFile(swPath, swSource, 'utf8');
  console.log(`  → public/sw.js generiert (Version: ${buildVersion})`);

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
