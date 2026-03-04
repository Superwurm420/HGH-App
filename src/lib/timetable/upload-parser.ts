import { getDocument, VerbosityLevel } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { ParsedSchedule } from './types';

const WEEKDAYS = ['MO', 'DI', 'MI', 'DO', 'FR'] as const;
const DAY_SET = new Set(WEEKDAYS);
const CLASS_PATTERN = /^[A-ZÄÖÜ]{1,5}\s?\d{1,2}[A-Z]?$/;

type TextItem = { str: string; x: number; y: number };
type Row = { y: number; items: TextItem[] };

function groupRows(items: TextItem[]): Row[] {
  const rows: Row[] = [];
  for (const item of items) {
    const row = rows.find((r) => Math.abs(r.y - item.y) <= 2.5);
    if (row) row.items.push(item);
    else rows.push({ y: item.y, items: [item] });
  }
  rows.sort((a, b) => b.y - a.y);
  for (const row of rows) row.items.sort((a, b) => a.x - b.x);
  return rows;
}

function detectClassCenters(rows: Row[]): Record<string, number> | null {
  if (rows.length === 0) return null;
  const top = rows[0].y;
  const pageHeight = top - (rows[rows.length - 1]?.y ?? 0);
  const headerThreshold = Math.max(120, pageHeight * 0.15);
  const headerRows = rows.filter((row) => row.y > top - headerThreshold);
  const classes = new Map<string, number>();

  for (const row of headerRows) {
    for (const item of row.items) {
      const token = item.str.toUpperCase().replace(/\s+/g, '');
      if (!CLASS_PATTERN.test(item.str.toUpperCase())) continue;
      if (item.x < 80) continue;
      if (!classes.has(token)) classes.set(token, item.x);
    }
  }

  if (classes.size === 0) return null;
  return Object.fromEntries([...classes.entries()].sort((a, b) => a[1] - b[1]));
}

const ROOM_RE = /^(\d{1,2}|#NV|#N\/A|BS)(\s*\/?\s*(\d{1,2}|#NV|BS))*$/i;
const isRoomValue = (s: string): boolean => ROOM_RE.test(s);
const isNoValue = (s: string): boolean => !s || s === '#NV' || s === '#N/A' || s === '#WERT!' || s === '#REF!';

export async function parseTimetablePdfBuffer(data: Uint8Array): Promise<ParsedSchedule> {
  const doc = await getDocument({ data, verbosity: VerbosityLevel.ERRORS }).promise;
  const page = await doc.getPage(1);
  const content = await page.getTextContent();

  const items: TextItem[] = content.items
    .flatMap((item) => {
      if (!('str' in item)) return [];
      return [{ str: (item.str || '').trim(), x: item.transform?.[4] ?? 0, y: item.transform?.[5] ?? 0 }];
    })
    .filter((item) => item.str)
    .sort((a, b) => b.y - a.y || a.x - b.x);

  const rows = groupRows(items);
  const classX = detectClassCenters(rows);
  if (!classX) throw new Error('Keine Klassen im PDF-Header erkannt.');

  const classes = Object.keys(classX);
  const firstClassX = Object.values(classX)[0];
  const timeColBoundary = Math.max(Math.round(firstClassX * 0.65), 85);

  const out = Object.fromEntries(classes.map((c) => [c, { MO: [], DI: [], MI: [], DO: [], FR: [] }])) as ParsedSchedule;

  const period1Ys: number[] = [];
  for (const row of rows) {
    const left = row.items.filter((i) => i.x < timeColBoundary);
    if (left.some((i) => i.str === '1.') && left.some((i) => /8[.:]00/.test(i.str))) period1Ys.push(row.y);
  }
  period1Ys.sort((a, b) => b - a);
  const daySections = period1Ys.map((startY, i) => ({
    startY,
    endY: i < period1Ys.length - 1 ? period1Ys[i + 1] + 3 : -Infinity,
    day: null as (typeof WEEKDAYS)[number] | null,
  }));

  for (const row of rows) {
    const dayToken = row.items.find((i) => i.x < timeColBoundary && DAY_SET.has(i.str as (typeof WEEKDAYS)[number]))?.str as (typeof WEEKDAYS)[number] | undefined;
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

  const getDayForY = (y: number): (typeof WEEKDAYS)[number] | null => {
    for (const sec of daySections) {
      if (y <= sec.startY + 5 && y > sec.endY) return sec.day;
    }
    return null;
  };

  const colBounds = (() => {
    const entries = Object.entries(classX).sort((a, b) => a[1] - b[1]);
    const bounds: Record<string, { left: number; right: number }> = {};
    for (let i = 0; i < entries.length; i++) {
      const [cls, x] = entries[i];
      const nextX = i < entries.length - 1 ? entries[i + 1][1] : null;
      bounds[cls] = { left: i === 0 ? timeColBoundary : Math.round((entries[i - 1][1] + x) / 2), right: nextX != null ? Math.round((x + nextX) / 2) : Math.round(x + 120) };
    }
    return bounds;
  })();

  const cellText = (row: Row, cls: string): string => row.items
    .filter((i) => i.x >= colBounds[cls].left && i.x < colBounds[cls].right)
    .map((i) => i.str)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();

  const lastByClass: Record<string, { period: number; time: string; subject?: string; room?: string; detail?: string; periodEnd?: number }> = {};

  for (const row of rows) {
    const day = getDayForY(row.y);
    if (!day) continue;
    if (row.items.some((i) => i.x < timeColBoundary && i.str.includes('Mittagspause'))) continue;

    let left = row.items.filter((i) => i.x < timeColBoundary).map((i) => i.str).join(' ').replace(/\s+/g, ' ').trim();
    for (const wd of WEEKDAYS) {
      if (left.startsWith(`${wd} `)) { left = left.slice(wd.length).trim(); break; }
    }

    const lessonMatch = left.match(/^(\d{1,2})\.\s*(\d{1,2}[.:]\d{2}\s*-\s*\d{1,2}[.:]\d{2})/);
    if (lessonMatch) {
      const period = Number(lessonMatch[1]);
      const time = lessonMatch[2];
      for (const cls of classes) {
        const subject = cellText(row, cls) || undefined;
        const entry = { period, time, subject };
        out[cls][day].push(entry);
        lastByClass[`${cls}:${day}`] = entry;
      }
      continue;
    }

    for (const cls of classes) {
      const val = cellText(row, cls);
      const key = `${cls}:${day}`;
      const target = lastByClass[key];
      if (!val || isNoValue(val) || !target) continue;
      if (isRoomValue(val)) target.room = val;
      else target.detail = target.detail ? `${target.detail} · ${val}` : val;
    }
  }

  return out;
}
