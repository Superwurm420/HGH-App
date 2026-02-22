import fs from 'node:fs';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

const pdfPath = process.argv[2];
if (!pdfPath) {
  console.error('PDF-Pfad fehlt.');
  process.exit(1);
}

const CLASSES = ['HT11', 'HT12', 'HT21', 'HT22', 'G11', 'G12', 'GT01'];
const WEEKDAYS = ['MO', 'DI', 'MI', 'DO', 'FR'];
const DAY_SET = new Set(WEEKDAYS);
const CLASS_X = { HT11: 113, HT12: 211, HT21: 309, HT22: 408, G11: 506, G12: 605, GT01: 706 };

const out = Object.fromEntries(CLASSES.map((c) => [c, { MO: [], DI: [], MI: [], DO: [], FR: [] }]));

const data = new Uint8Array(fs.readFileSync(pdfPath));
const doc = await getDocument({ data }).promise;
const page = await doc.getPage(1);
const content = await page.getTextContent();

const items = content.items
  .map((item) => ({ str: item.str, x: item.transform[4], y: item.transform[5] }))
  .sort((a, b) => b.y - a.y || a.x - b.x);

const rows = [];
for (const item of items) {
  const row = rows.find((r) => Math.abs(r.y - item.y) <= 1.5);
  if (row) row.items.push(item);
  else rows.push({ y: item.y, items: [item] });
}
rows.sort((a, b) => b.y - a.y);
for (const row of rows) row.items.sort((a, b) => a.x - b.x);

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
    for (const c of CLASSES) delete lastByClass[c];
  }
  if (!day) continue;

  const left = row.items.filter((i) => i.x < 105).map((i) => i.str).join(' ').replace(/\s+/g, ' ').trim();
  const lessonMatch = left.match(/^(\d+)\.\s*(\d{1,2}\.\d{2}\s*-\s*\d{1,2}\.\d{2})/);

  if (lessonMatch) {
    const period = Number(lessonMatch[1]);
    const time = lessonMatch[2];
    for (const cls of CLASSES) {
      const subject = cellText(row, CLASS_X[cls]);
      const entry = { period, time, subject: subject || undefined };
      out[cls][day].push(entry);
      lastByClass[cls] = entry;
    }
    continue;
  }

  if (row.items.some((i) => i.x < 100 && i.str.includes('Mittagspause'))) continue;

  for (const cls of CLASSES) {
    const detail = cellText(row, CLASS_X[cls]);
    if (!detail || !lastByClass[cls]) continue;
    lastByClass[cls].detail = lastByClass[cls].detail ? `${lastByClass[cls].detail} · ${detail}` : detail;
  }
}

for (const cls of CLASSES) {
  for (const d of WEEKDAYS) {
    out[cls][d] = out[cls][d].filter((l) => l.subject && l.subject !== 'R');
  }
}

console.log(JSON.stringify(out));
