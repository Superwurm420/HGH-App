import fs from 'node:fs';

// pdfjs-dist v5 removed the legacy/ folder; try common paths
let pdfjsLib;
try { pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs'); }
catch { try { pdfjsLib = await import('pdfjs-dist/build/pdf.mjs'); }
catch { pdfjsLib = await import('pdfjs-dist'); } }
const { getDocument } = pdfjsLib;

const pdfPath = process.argv[2];
if (!pdfPath) {
  console.error('PDF-Pfad fehlt. Nutzung: node parse-timetable-pdf.mjs <pfad.pdf>');
  process.exit(1);
}

const WEEKDAYS = ['MO', 'DI', 'MI', 'DO', 'FR'];
const DAY_SET = new Set(WEEKDAYS);
const CLASS_PATTERN = /^[A-Z]{1,3}\d{2}$/;

const data = new Uint8Array(fs.readFileSync(pdfPath));
const doc = await getDocument({ data }).promise;
const page = await doc.getPage(1);
const content = await page.getTextContent();

const items = content.items
  .map((item) => ({ str: (item.str || '').trim(), x: item.transform?.[4] ?? 0, y: item.transform?.[5] ?? 0 }))
  .filter((item) => item.str)
  .sort((a, b) => b.y - a.y || a.x - b.x);

const rows = [];
for (const item of items) {
  const row = rows.find((r) => Math.abs(r.y - item.y) <= 2.5);
  if (row) row.items.push(item);
  else rows.push({ y: item.y, items: [item] });
}
rows.sort((a, b) => b.y - a.y);
for (const row of rows) row.items.sort((a, b) => a.x - b.x);

// Dynamische Klassen-Erkennung
function detectClassCenters() {
  if (rows.length === 0) return null;
  const top = rows[0].y;
  const pageHeight = top - (rows[rows.length - 1]?.y ?? 0);
  const headerThreshold = Math.max(120, pageHeight * 0.15);
  const headerRows = rows.filter((row) => row.y > top - headerThreshold);
  const classes = new Map();

  for (const row of headerRows) {
    for (const item of row.items) {
      const token = item.str.toUpperCase();
      if (!CLASS_PATTERN.test(token)) continue;
      if (item.x < 80) continue;
      if (!classes.has(token)) classes.set(token, item.x);
    }
  }

  if (classes.size === 0) return null;
  return Object.fromEntries([...classes.entries()].sort((a, b) => a[1] - b[1]));
}

// Dynamische Spaltenbreiten
function computeColumnBounds(classX) {
  const entries = Object.entries(classX).sort((a, b) => a[1] - b[1]);
  const bounds = {};
  for (let i = 0; i < entries.length; i++) {
    const [cls, x] = entries[i];
    const prevX = i > 0 ? entries[i - 1][1] : x - 80;
    const nextX = i < entries.length - 1 ? entries[i + 1][1] : x + 120;
    bounds[cls] = { left: Math.round((prevX + x) / 2), right: Math.round((x + nextX) / 2) };
  }
  return bounds;
}

const classX = detectClassCenters();
if (!classX) {
  console.error('Keine Klassen im PDF-Header erkannt.');
  process.exit(1);
}

const classes = Object.keys(classX);
const columnBounds = computeColumnBounds(classX);
const out = Object.fromEntries(classes.map((c) => [c, { MO: [], DI: [], MI: [], DO: [], FR: [] }]));

// Zeitspalten-Grenze adaptiv erkennen
let timeColBoundary = 105;
for (const row of rows) {
  for (const item of row.items) {
    if (DAY_SET.has(item.str)) {
      timeColBoundary = Math.max(item.x + 60, 90);
      break;
    }
  }
  if (timeColBoundary !== 105) break;
}

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
  const dayToken = row.items.find((i) => i.x < timeColBoundary && DAY_SET.has(i.str))?.str;
  if (dayToken) {
    day = dayToken;
    for (const c of classes) delete lastByClass[c];
  }
  if (!day) continue;

  const left = row.items.filter((i) => i.x < timeColBoundary).map((i) => i.str).join(' ').replace(/\s+/g, ' ').trim();
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
    lastByClass[cls].detail = lastByClass[cls].detail ? `${lastByClass[cls].detail} · ${detail}` : detail;
  }
}

for (const cls of classes) {
  for (const d of WEEKDAYS) {
    out[cls][d] = out[cls][d].filter((l) => l.subject && l.subject !== 'R');
  }
}

// Diagnose auf stderr
let totalLessons = 0;
for (const cls of classes) {
  let count = 0;
  for (const d of WEEKDAYS) count += out[cls][d].length;
  totalLessons += count;
  if (count === 0) console.error(`WARNUNG: ${cls} hat 0 Stunden.`);
}
console.error(`Erkannte Klassen: ${classes.join(', ')}`);
console.error(`Stunden gesamt: ${totalLessons}`);

console.log(JSON.stringify(out));
