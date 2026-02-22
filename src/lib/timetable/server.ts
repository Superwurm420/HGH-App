import fs from 'node:fs/promises';
import path from 'node:path';
import { weekdayForToday } from './pdfParser';
import { selectLatestTimetable } from './selectLatest';
import { LessonEntry, ParsedSchedule, SchoolClass, Weekday } from './types';

const TIMETABLE_DIR = path.join(process.cwd(), 'public/content/timetables');

const DEFAULT_CLASS_X = { HT11: 113, HT12: 211, HT21: 309, HT22: 408, G11: 506, G12: 605, GT01: 706 };
const WEEKDAYS: Weekday[] = ['MO', 'DI', 'MI', 'DO', 'FR'];
const DAY_SET = new Set<string>(WEEKDAYS);
const CLASS_PATTERN = /^[A-Z]{1,3}\d{2}$/;

type TextItem = {
  str: string;
  x: number;
  y: number;
};

type Row = {
  y: number;
  items: TextItem[];
};

export async function getLatestTimetable() {
  const files = await fs.readdir(TIMETABLE_DIR);
  const pdfs = files.filter((f) => f.toLowerCase().endsWith('.pdf'));
  return selectLatestTimetable(pdfs);
}

async function parsePdf(fileName: string): Promise<ParsedSchedule> {
  const pdfPath = path.join(TIMETABLE_DIR, fileName);
  const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs');

  const data = new Uint8Array(await fs.readFile(pdfPath));
  const doc = await getDocument({ data }).promise;
  const page = await doc.getPage(1);
  const content = await page.getTextContent();

  const items: TextItem[] = (content.items as Array<{ str?: string; transform?: number[] }>)
    .map((item) => ({ str: item.str?.trim() ?? '', x: item.transform?.[4] ?? 0, y: item.transform?.[5] ?? 0 }))
    .filter((item) => item.str)
    .sort((a, b) => b.y - a.y || a.x - b.x);

  const rows: Row[] = [];
  for (const item of items) {
    const row = rows.find((r) => Math.abs(r.y - item.y) <= 1.5);
    if (row) row.items.push(item);
    else rows.push({ y: item.y, items: [item] });
  }

  rows.sort((a, b) => b.y - a.y);
  for (const row of rows) row.items.sort((a, b) => a.x - b.x);

  const classX = detectClassCenters(rows);
  const classes = Object.keys(classX);
  const out: ParsedSchedule = Object.fromEntries(classes.map((cls) => [cls, { MO: [], DI: [], MI: [], DO: [], FR: [] }]));

  const cellText = (row: Row, centerX: number) =>
    row.items
      .filter((i) => i.x >= centerX - 28 && i.x <= centerX + 70)
      .map((i) => i.str)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();

  let day: Weekday | null = null;
  const lastByClass: Record<string, LessonEntry | undefined> = {};

  for (const row of rows) {
    const dayToken = row.items.find((i) => i.x < 55 && DAY_SET.has(i.str))?.str as Weekday | undefined;
    if (dayToken) {
      day = dayToken;
      for (const cls of classes) delete lastByClass[cls];
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

  return out;
}

function detectClassCenters(rows: Row[]): Record<string, number> {
  const top = rows[0]?.y ?? 0;
  const headerRows = rows.filter((row) => row.y > top - 120);
  const classes = new Map<string, number>();

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

let cache: { filename: string; parsed: ParsedSchedule } | null = null;

export async function getWeeklyPlanForClass(requestedClass?: SchoolClass) {
  const latest = await getLatestTimetable();
  if (!latest) return null;

  const parsed = cache?.filename === latest.filename ? cache.parsed : await parsePdf(latest.filename);
  if (!cache || cache.filename !== latest.filename) cache = { filename: latest.filename, parsed };

  const availableClasses = Object.keys(parsed).sort();
  if (availableClasses.length === 0) return null;

  const schoolClass = requestedClass && parsed[requestedClass] ? requestedClass : availableClasses[0];

  return {
    latest,
    availableClasses,
    schoolClass,
    week: parsed[schoolClass],
    todayKey: weekdayForToday(),
  };
}
