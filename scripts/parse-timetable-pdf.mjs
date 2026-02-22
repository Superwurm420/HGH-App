import fs from 'node:fs';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

const pdfPath = process.argv[2];
if (!pdfPath) {
  console.error('PDF-Pfad fehlt.');
  process.exit(1);
}

const DEFAULT_CLASS_X = { HT11: 113, HT12: 211, HT21: 309, HT22: 408, G11: 506, G12: 605, GT01: 706 };
const WEEKDAYS = ['MO', 'DI', 'MI', 'DO', 'FR'];
const DAY_SET = new Set(WEEKDAYS);
const CLASS_PATTERN = /^[A-Z]{1,3}\d{2}$/;

const data = new Uint8Array(fs.readFileSync(pdfPath));
const doc = await getDocument({ data }).promise;
const page = await doc.getPage(1);
const content = await page.getTextContent();

const items = content.items
  .map((item) => ({ str: item.str.trim(), x: item.transform[4], y: item.transform[5] }))
  .filter((item) => item.str)
  .sort((a, b) => b.y - a.y || a.x - b.x);

const rows = [];
for (const item of items) {
  const row = rows.find((r) => Math.abs(r.y - item.y) <= 1.5);
  if (row) row.items.push(item);
  else rows.push({ y: item.y, items: [item] });
}
rows.sort((a, b) => b.y - a.y);
for (const row of rows) row.items.sort((a, b) => a.x - b.x);

function detectClassCenters() {
  const headerRows = rows.filter((row) => row.y > rows[0].y - 120);
  const classes = new Map();

  for (const row of headerRows) {
    for (const item of row.items) {
      const token = item.str.toUpperCase();
      if (!CLASS_PATTERN.test(token)) continue;
      if (item.x < 100) continue;
      if (!classes.has(token)) classes.set(token, item.x);
    }
  }

  if (classes.size >= 3) return Object.fromEntries([...classes.entries()].sort((a, b) => a[1] - b[1]));
  return DEFAULT_CLASS_X;
}

const classX = detectClassCenters();
const classes = Object.keys(classX);
const out = Object.fromEntries(classes.map((c) => [c, { MO: [], DI: [], MI: [], DO: [], FR: [] }]));

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
    for (const c of classes) delete lastByClass[c];
  }
  if (!day) continue;

  const left = row.items.filter((i) => i.x < 105).map((i) => i.str).join(' ').replace(/\s+/g, ' ').trim();
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
    lastByClass[cls].detail = lastByClass[cls].detail ? `${lastByClass[cls].detail} · ${detail}` : detail;
  }
}

for (const cls of classes) {
  for (const d of WEEKDAYS) {
    out[cls][d] = out[cls][d].filter((l) => l.subject && l.subject !== 'R');
  }
}

console.log(JSON.stringify(out));
