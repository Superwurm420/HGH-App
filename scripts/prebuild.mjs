/**
 * Prebuild script – parses timetable PDFs and announcement TXT files
 * at build time so that the Next.js app only needs static JSON at runtime.
 *
 * Runs before `next build` (see package.json "build" script).
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
const DEFAULT_CLASS_X = { HT11: 113, HT12: 211, HT21: 309, HT22: 408, G11: 506, G12: 605, GT01: 706 };

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
    href: `/content/timetables/${filename}`,
  };
}

function compareTimetable(a, b) {
  if (b.yearStart !== a.yearStart) return b.yearStart - a.yearStart;
  if (b.halfYear !== a.halfYear) return b.halfYear - a.halfYear;
  return b.kw - a.kw;
}

// ── PDF parsing ─────────────────────────────────────────────────────────────

async function loadPdfjs() {
  // pdfjs-dist v5 removed the legacy/ folder; try common paths
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

function detectClassCenters(rows) {
  const top = rows[0]?.y ?? 0;
  const headerRows = rows.filter((row) => row.y > top - 120);
  const classes = new Map();

  for (const row of headerRows) {
    for (const item of row.items) {
      const token = item.str.toUpperCase();
      if (!CLASS_PATTERN.test(token)) continue;
      if (item.x < 100) continue;
      if (!classes.has(token)) classes.set(token, item.x);
    }
  }

  if (classes.size >= 3) {
    return Object.fromEntries([...classes.entries()].sort((a, b) => a[1] - b[1]));
  }
  return { ...DEFAULT_CLASS_X };
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

  // Group into rows
  const rows = [];
  for (const item of items) {
    const row = rows.find((r) => Math.abs(r.y - item.y) <= 1.5);
    if (row) row.items.push(item);
    else rows.push({ y: item.y, items: [item] });
  }
  rows.sort((a, b) => b.y - a.y);
  for (const row of rows) row.items.sort((a, b) => a.x - b.x);

  // Detect class columns
  const classX = detectClassCenters(rows);
  const classes = Object.keys(classX);
  const out = Object.fromEntries(
    classes.map((cls) => [cls, { MO: [], DI: [], MI: [], DO: [], FR: [] }]),
  );

  const cellText = (row, centerX) =>
    row.items
      .filter((i) => i.x >= centerX - 28 && i.x <= centerX + 70)
      .map((i) => i.str)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();

  let day = null;
  const lastByClass = {};

  for (const row of rows) {
    const dayToken = row.items.find((i) => i.x < 55 && DAY_SET.has(i.str))?.str;
    if (dayToken) {
      day = dayToken;
      for (const cls of classes) delete lastByClass[cls];
    }
    if (!day) continue;

    const left = row.items
      .filter((i) => i.x < 105)
      .map((i) => i.str)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
    const lessonMatch = left.match(/^(\d+)\.\s*(\d{1,2}\.\d{2}\s*-\s*\d{1,2}\.\d{2})/);

    if (lessonMatch) {
      const period = Number(lessonMatch[1]);
      const time = lessonMatch[2];
      for (const cls of classes) {
        const subject = cellText(row, classX[cls]);
        const entry = { period, time, subject: subject || undefined };
        out[cls][day].push(entry);
        lastByClass[cls] = entry;
      }
      continue;
    }

    if (row.items.some((i) => i.x < 100 && i.str.includes('Mittagspause'))) continue;

    for (const cls of classes) {
      const detail = cellText(row, classX[cls]);
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
  console.log('Parsing timetables...');
  let timetableFiles = [];
  try {
    timetableFiles = (await fs.readdir(TIMETABLE_DIR)).filter((f) =>
      f.toLowerCase().endsWith('.pdf'),
    );
  } catch {
    console.warn('  Timetable directory not found – skipping PDF parsing.');
  }

  const metas = timetableFiles.map(parseTimetableFilename).filter(Boolean);
  metas.sort(compareTimetable);

  const schedules = {};

  if (metas.length > 0) {
    const pdfjsLib = await loadPdfjs();
    const { getDocument } = pdfjsLib;

    for (const meta of metas) {
      try {
        console.log(`  Parsing ${meta.filename}...`);
        schedules[meta.filename] = await parsePdf(
          path.join(TIMETABLE_DIR, meta.filename),
          getDocument,
        );
      } catch (err) {
        console.error(`  Error parsing ${meta.filename}: ${err.message}`);
      }
    }
  }

  const timetableData = { files: metas, schedules };
  await fs.writeFile(
    path.join(OUTPUT_DIR, 'timetable-data.json'),
    JSON.stringify(timetableData, null, 2),
  );
  console.log(`Wrote timetable data (${metas.length} files, ${Object.keys(schedules).length} parsed)`);

  // ── Announcements ──
  console.log('Parsing announcements...');
  let announcementFiles = [];
  try {
    announcementFiles = (await fs.readdir(ANNOUNCEMENT_DIR)).filter((f) =>
      f.toLowerCase().endsWith('.txt'),
    );
  } catch {
    console.warn('  Announcement directory not found – skipping.');
  }

  const announcements = [];
  for (const file of announcementFiles) {
    const raw = await fs.readFile(path.join(ANNOUNCEMENT_DIR, file), 'utf8');
    announcements.push(parseAnnouncement(raw, file));
  }

  await fs.writeFile(
    path.join(OUTPUT_DIR, 'announcements-data.json'),
    JSON.stringify(announcements, null, 2),
  );
  console.log(`Wrote announcement data (${announcements.length} files)`);

  console.log('Prebuild complete!');
}

main().catch((err) => {
  console.error('Prebuild failed:', err);
  process.exit(1);
});
