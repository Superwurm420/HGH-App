/**
 * Stundenplan-PDF-Parser
 *
 * Portiert aus scripts/prebuild.mjs für den Einsatz in Cloudflare Workers.
 * Parst ein Stundenplan-PDF und extrahiert strukturierte Lesson-Entries.
 *
 * Achtung: pdfjs-dist ist eine große Dependency. Falls sie im Worker-Bundle
 * zu groß wird, kann das Parsing in einen separaten Worker ausgelagert werden.
 */

import { ParsedSchedule, LessonEntry, Weekday } from '../types';

const CLASS_PATTERN = /^[A-ZÄÖÜ]{1,5}\s?\d{1,2}[A-Z]?$/;
const WEEKDAYS: Weekday[] = ['MO', 'DI', 'MI', 'DO', 'FR'];
const DAY_SET = new Set<string>(WEEKDAYS);

interface TextItem {
  str: string;
  x: number;
  y: number;
  width: number;
}

interface TextRow {
  y: number;
  items: TextItem[];
}

interface ColumnBounds {
  left: number;
  right: number;
  center: number;
}

interface SortedClass extends ColumnBounds {
  cls: string;
}

// ── Helpers ─────────────────────────────────────────────────────────

function isNoValue(s: string): boolean {
  return !s || s === '#NV' || s === '#N/A' || s === '#WERT!' || s === '#REF!';
}

const ROOM_RE = /^(\d{1,2}|#NV|#N\/A|BS)(\s*\/?\s*(\d{1,2}|#NV|BS))*$/i;

function isRoomValue(s: string): boolean {
  return ROOM_RE.test(s);
}

function isTeacherToken(s: string): boolean {
  return /^[A-ZÄÖÜ]{2,6}(\/[A-ZÄÖÜ]{2,6})*$/.test((s ?? '').trim());
}

// ── Detection functions ─────────────────────────────────────────────

function detectClassCenters(rows: TextRow[]): Record<string, number> | null {
  if (rows.length === 0) return null;

  const top = rows[0].y;
  const pageHeight = top - (rows[rows.length - 1]?.y ?? 0);
  const headerThreshold = Math.max(120, pageHeight * 0.15);
  const headerRows = rows.filter((row) => row.y > top - headerThreshold);

  const classes = new Map<string, number>();

  for (const row of headerRows) {
    for (const item of row.items) {
      if (!CLASS_PATTERN.test(item.str.toUpperCase())) continue;
      const token = item.str.toUpperCase().replace(/\s+/g, '');
      if (item.x < 80) continue;
      if (!classes.has(token)) classes.set(token, item.x);
    }
  }

  if (classes.size === 0) return null;
  return Object.fromEntries([...classes.entries()].sort((a, b) => a[1] - b[1]));
}

function detectTimeColumnBoundary(classX: Record<string, number>): number {
  const firstClassX = Object.values(classX)[0];
  return Math.max(Math.round(firstClassX * 0.65), 85);
}

function detectRoomColumns(
  rows: TextRow[],
  classX: Record<string, number>,
  timeColBoundary: number,
): Record<string, number> | null {
  if (rows.length === 0) return null;
  const top = rows[0].y;
  const pageHeight = top - (rows[rows.length - 1]?.y ?? 0);
  const headerThreshold = Math.max(120, pageHeight * 0.15);
  const headerRows = rows.filter((row) => row.y > top - headerThreshold);

  const rPositions: number[] = [];
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
  const roomCols: Record<string, number> = {};
  for (const rx of rPositions) {
    let best: string | null = null;
    for (const [cls, cx] of classEntries) {
      if (cx <= rx) best = cls;
    }
    if (best && !roomCols[best]) {
      roomCols[best] = rx;
    }
  }

  return Object.keys(roomCols).length > 0 ? roomCols : null;
}

function computeColumnBounds(
  classX: Record<string, number>,
  timeColBoundary: number,
  roomColumns: Record<string, number> | null,
): Record<string, ColumnBounds> {
  const entries = Object.entries(classX).sort((a, b) => a[1] - b[1]);
  const bounds: Record<string, ColumnBounds> = {};
  const ROOM_COL_MARGIN = 5;

  for (let i = 0; i < entries.length; i++) {
    const [cls, x] = entries[i];
    const nextX = i < entries.length - 1 ? entries[i + 1][1] : null;
    const prevEntry = i > 0 ? entries[i - 1] : null;

    let left: number;
    if (i === 0) {
      left = timeColBoundary;
    } else {
      const prevRoomX = roomColumns?.[prevEntry![0]];
      if (prevRoomX != null) {
        left = Math.round(prevRoomX) + ROOM_COL_MARGIN;
      } else {
        left = Math.round((prevEntry![1] + x) / 2);
      }
    }

    let right: number;
    const roomX = roomColumns?.[cls];
    if (roomX != null && nextX != null) {
      right = Math.round(roomX) + ROOM_COL_MARGIN;
    } else if (roomX != null) {
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

// ── Merge helpers ───────────────────────────────────────────────────

function mergeTimeRange(time1: string, time2: string): string {
  const startMatch = time1.match(/^(\d{1,2}[.:]\d{2})/);
  const endMatch = time2.match(/(\d{1,2}[.:]\d{2})\s*$/);
  if (startMatch && endMatch) {
    return `${startMatch[1]} - ${endMatch[1]}`;
  }
  return time1;
}

function mergePeriodPairs(lessons: LessonEntry[]): LessonEntry[] {
  if (lessons.length === 0) return [];

  const sorted = [...lessons].sort((a, b) => a.period - b.period);
  const result: LessonEntry[] = [];
  let i = 0;

  while (i < sorted.length) {
    const curr = sorted[i];
    const next = sorted[i + 1];

    const isOdd = curr.period % 2 === 1;
    const isConsecutive = next && next.period === curr.period + 1;
    const teacherKuerzel = (next?.subject ?? '').trim();
    const isTeacher = /^[A-ZÄÖÜ]{2,6}(\/[A-ZÄÖÜ]{2,6})*$/.test(teacherKuerzel);

    if (isOdd && isConsecutive && isTeacher) {
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
        detail: mergedDetail,
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

// ── Block special entry normalization ───────────────────────────────

function normalizeBlockSpecialEntries(
  schedule: ParsedSchedule,
  dayPeriodTimes: Record<string, Record<number, string>>,
): void {
  const dayIndex: Record<string, number> = Object.fromEntries(
    WEEKDAYS.map((day, idx) => [day, idx]),
  );

  function sanitizeSubject(subject: string): string {
    return subject.replace(/["„""'`]/g, '').replace(/\s+/g, ' ').trim();
  }

  function buildBlockTitle(entries: Array<{ subject?: string }>): string | null {
    const tokens = entries
      .map((entry) => sanitizeSubject(entry.subject ?? ''))
      .filter(Boolean);
    if (tokens.length === 0) return null;

    const deduped: string[] = [];
    for (const token of tokens) {
      if (deduped.length === 0 || deduped[deduped.length - 1] !== token) {
        deduped.push(token);
      }
    }

    let title = '';
    for (const token of deduped) {
      if (!title) { title = token; continue; }
      if (title.endsWith('-')) title = `${title.slice(0, -1)}${token}`;
      else title = `${title} ${token}`;
    }

    return title.replace(/\s+/g, ' ').trim();
  }

  function applyBlockForDays(
    cls: string,
    days: string[],
    fragmentEntries: Array<{ subject?: string }>,
  ): void {
    const title = buildBlockTitle(fragmentEntries);
    if (!title || title.length < 4) return;

    for (const day of days) {
      const periods = Object.keys(dayPeriodTimes[day]).map(Number).sort((a, b) => a - b);
      if (periods.length === 0) continue;

      const first = periods[0];
      const last = periods[periods.length - 1];
      const time = mergeTimeRange(dayPeriodTimes[day][first], dayPeriodTimes[day][last]);

      schedule[cls][day as Weekday] = [{
        period: first,
        periodEnd: last,
        time,
        subject: title,
      }];
    }
  }

  for (const cls of Object.keys(schedule)) {
    const allEntries = WEEKDAYS.flatMap((day) =>
      (schedule[cls][day] ?? []).map((entry) => ({ ...entry, day })),
    ).sort((a, b) => (dayIndex[a.day] - dayIndex[b.day]) || a.period - b.period);

    if (allEntries.length < 2) continue;

    const hasAnyTeacher = allEntries.some((entry) => entry.detail);

    if (!hasAnyTeacher) {
      const fragmentEntries = allEntries.filter((e) => sanitizeSubject(e.subject ?? '').length > 0);
      if (fragmentEntries.length < 2) continue;

      const hasFragmentLikeText = fragmentEntries.some((entry) => {
        const subject = sanitizeSubject(entry.subject ?? '');
        return subject.includes('-') || subject !== subject.toLowerCase();
      });
      if (!hasFragmentLikeText) continue;

      const classHasOnlyFragments = allEntries.length === fragmentEntries.length;
      const firstDayIdx = Math.min(...fragmentEntries.map((e) => dayIndex[e.day]));
      const lastDayIdx = Math.max(...fragmentEntries.map((e) => dayIndex[e.day]));

      const coveredDays = (classHasOnlyFragments && allEntries.length <= 10
        ? WEEKDAYS
        : WEEKDAYS.slice(firstDayIdx, lastDayIdx + 1)
      ).filter((day) => Object.keys(dayPeriodTimes[day]).length > 0);

      if (coveredDays.length > 0) {
        applyBlockForDays(cls, coveredDays, fragmentEntries);
      }
      continue;
    }

    // Per-day fragment merge
    for (const day of WEEKDAYS) {
      const dayEntries = schedule[cls][day] ?? [];
      if (dayEntries.length < 2) continue;
      if (dayEntries.some((e) => e.detail)) continue;

      const cleaned = dayEntries
        .map((e) => ({ ...e, cleanSubject: sanitizeSubject(e.subject ?? '') }))
        .filter((e) => e.cleanSubject.length > 0);
      if (cleaned.length < 2) continue;

      const hasTrailingHyphen = cleaned.some((e) => e.cleanSubject.endsWith('-'));
      if (!hasTrailingHyphen) continue;

      applyBlockForDays(cls, [day], cleaned);
    }
  }
}

// ── Main parser ─────────────────────────────────────────────────────

/**
 * Parst ein Stundenplan-PDF aus einem ArrayBuffer.
 * Erwartet pdfjs-dist als externe Dependency (getDocument, VerbosityLevel).
 */
export async function parseTimetablePdf(
  pdfData: ArrayBuffer,
  getDocument: (params: { data: Uint8Array; verbosity?: number }) => { promise: Promise<{ getPage(n: number): Promise<{ getTextContent(): Promise<{ items: Array<{ str?: string; transform?: number[]; width?: number }> }> }> }> },
  verbosityLevel?: number,
): Promise<ParsedSchedule> {
  const data = new Uint8Array(pdfData);
  const doc = await getDocument({ data, verbosity: verbosityLevel ?? 0 }).promise;
  const page = await doc.getPage(1);
  const content = await page.getTextContent();

  const items: TextItem[] = content.items
    .map((item) => ({
      str: (item.str || '').trim(),
      x: item.transform?.[4] ?? 0,
      y: item.transform?.[5] ?? 0,
      width: item.width ?? 0,
    }))
    .filter((item) => item.str)
    .sort((a, b) => b.y - a.y || a.x - b.x);

  // Group into rows
  const rows: TextRow[] = [];
  for (const item of items) {
    const row = rows.find((r) => Math.abs(r.y - item.y) <= 2.5);
    if (row) row.items.push(item);
    else rows.push({ y: item.y, items: [item] });
  }
  rows.sort((a, b) => b.y - a.y);
  for (const row of rows) row.items.sort((a, b) => a.x - b.x);

  // Detect class columns
  const classX = detectClassCenters(rows);
  if (!classX) {
    throw new Error('Keine Klassen im PDF-Header erkannt.');
  }

  const classes = Object.keys(classX);
  const timeColBoundary = detectTimeColumnBoundary(classX);
  const roomColumns = detectRoomColumns(rows, classX, timeColBoundary);
  const columnBounds = computeColumnBounds(classX, timeColBoundary, roomColumns);

  const out: ParsedSchedule = Object.fromEntries(
    classes.map((cls) => [cls, { MO: [], DI: [], MI: [], DO: [], FR: [] }]),
  ) as ParsedSchedule;

  const dayPeriodTimes: Record<string, Record<number, string>> = {
    MO: {}, DI: {}, MI: {}, DO: {}, FR: {},
  };

  const sortedClasses: SortedClass[] = classes
    .map((cls) => ({ cls, ...columnBounds[cls] }))
    .sort((a, b) => a.left - b.left);

  function resolveItemClasses(item: TextItem): string[] {
    const xStart = item.x;
    const xEnd = item.x + Math.max(item.width, 1);
    const overlapping = sortedClasses
      .filter((cls) => xStart < cls.right && xEnd > cls.left)
      .map((cls) => cls.cls);
    if (overlapping.length > 0) return overlapping;

    const nearest = sortedClasses.reduce<{ cls: string; distance: number } | null>((best, cls) => {
      const distance = Math.abs((xStart + xEnd) / 2 - cls.center);
      if (!best || distance < best.distance) return { cls: cls.cls, distance };
      return best;
    }, null);
    return nearest ? [nearest.cls] : [];
  }

  function getRowClassTextsWithSpan(row: TextRow, allowSpan: boolean): Record<string, string> {
    const byClass: Record<string, string[]> = Object.fromEntries(
      classes.map((cls) => [cls, []]),
    );
    for (const item of row.items) {
      if (item.x < timeColBoundary) continue;
      const targets = allowSpan
        ? resolveItemClasses(item)
        : [
          sortedClasses.reduce<{ cls: string; distance: number } | null>((best, cls) => {
            const distance = Math.abs(item.x - cls.center);
            if (!best || distance < best.distance) return { cls: cls.cls, distance };
            return best;
          }, null)?.cls,
        ].filter(Boolean) as string[];

      const isPotentialBlockText =
        !isNoValue(item.str) &&
        !isRoomValue(item.str) &&
        !isTeacherToken(item.str) &&
        targets.length > 1;

      if (allowSpan && !isPotentialBlockText) {
        const containing = sortedClasses.find(
          (cls) => item.x >= cls.left && item.x < cls.right,
        );
        if (containing) {
          byClass[containing.cls].push(item.str);
        } else {
          const nearest = sortedClasses.reduce<{ cls: string; distance: number } | null>((best, cls) => {
            const distance = Math.abs(item.x - cls.center);
            if (!best || distance < best.distance) return { cls: cls.cls, distance };
            return best;
          }, null);
          if (nearest) byClass[nearest.cls].push(item.str);
        }
        continue;
      }

      for (const cls of targets) byClass[cls].push(item.str);
    }

    return Object.fromEntries(
      classes.map((cls) => [cls, byClass[cls].join(' ').replace(/\s+/g, ' ').trim()]),
    );
  }

  const cellText = (rowClassTexts: Record<string, string>, cls: string) => rowClassTexts[cls] ?? '';

  // Pre-scan: detect day boundaries
  const period1Ys: number[] = [];
  for (const row of rows) {
    const leftItems = row.items.filter((i) => i.x < timeColBoundary);
    const hasPeriod1 = leftItems.some((i) => i.str === '1.');
    const hasEightOClock = leftItems.some((i) => /8[.:]00/.test(i.str));
    if (hasPeriod1 && hasEightOClock) period1Ys.push(row.y);
  }
  period1Ys.sort((a, b) => b - a);

  const daySections = period1Ys.map((startY, i) => {
    const endY = i < period1Ys.length - 1 ? period1Ys[i + 1] + 3 : -Infinity;
    return { startY, endY, day: null as string | null };
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

  function getDayForY(y: number): string | null {
    for (const sec of daySections) {
      if (y <= sec.startY + 5 && y > sec.endY) return sec.day;
    }
    return null;
  }

  const periodRowYs = rows
    .map((row) => {
      const leftText = row.items
        .filter((i) => i.x < timeColBoundary)
        .map((i) => i.str)
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();
      return /^\d{1,2}\.\s*\d{1,2}[.:]\d{2}\s*-\s*\d{1,2}[.:]\d{2}/.test(leftText) ? row.y : null;
    })
    .filter((y): y is number => y != null);
  const minTimetableY = periodRowYs.length > 0 ? Math.min(...periodRowYs) - 4 : -Infinity;

  const lastByClass: Record<string, LessonEntry> = {};

  for (const row of rows) {
    if (row.y < minTimetableY) continue;
    const day = getDayForY(row.y);
    if (!day) continue;

    const rowClassTexts = getRowClassTextsWithSpan(row, false);

    if (row.items.some((i) => i.x < timeColBoundary && i.str.includes('Mittagspause'))) continue;

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
      if (!dayPeriodTimes[day][period]) dayPeriodTimes[day][period] = time;
      for (const cls of classes) {
        let subject = cellText(rowClassTexts, cls);
        let room: string | undefined;
        const leadingRoom = subject.match(/^(\d{1,2})\s+(\S.*)$/);
        if (leadingRoom) {
          room = leadingRoom[1];
          subject = leadingRoom[2];
        }
        const entry: LessonEntry = { period, time, subject: subject || undefined, ...(room ? { room } : {}) };
        (out[cls][day as Weekday] as LessonEntry[]).push(entry);
        lastByClass[`${cls}:${day}`] = entry;
      }
      continue;
    }

    // Non-period row
    const rowClassTextsSpan = getRowClassTextsWithSpan(row, true);
    for (const cls of classes) {
      const val = cellText(rowClassTextsSpan, cls);
      const key = `${cls}:${day}`;
      if (!val || isNoValue(val) || !lastByClass[key]) continue;

      const prev = lastByClass[key];
      const canReusePreviousSlot = !prev.subject && !prev.detail && !prev.room;
      const isSpecialCell = !isRoomValue(val) && !isTeacherToken(val);
      const previousSubject = (prev.subject ?? '').trim();
      const hasOnlySubjectSoFar = !!previousSubject && !prev.detail && !prev.room;
      const canExtendSpecialSubject = hasOnlySubjectSoFar && !isTeacherToken(previousSubject);

      if (canReusePreviousSlot && isSpecialCell) {
        prev.subject = val;
        continue;
      }

      if (canExtendSpecialSubject && isSpecialCell) {
        prev.subject = `${previousSubject} ${val}`.replace(/\s+/g, ' ').trim();
        continue;
      }

      if (isRoomValue(val)) {
        prev.room = val;
      } else {
        prev.detail = prev.detail ? `${prev.detail} · ${val}` : val;
      }
    }
  }

  // Post-process
  const classSet = new Set(classes.map((c) => c.toUpperCase()));
  const TIME_RANGE_SUBJECT = /^\d{1,2}[.:]\d{2}\s*-\s*\d{1,2}[.:]\d{2}/;
  const PURE_NUMBER_SUBJECT = /^\d{1,3}$/;

  function normalizeSubjectText(value?: string): string | undefined {
    const normalized = (value ?? '')
      .replace(/#(NV|N\/A|WERT!|REF!)/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    return normalized || undefined;
  }

  function dedupeTokenList(value: string): string {
    const tokens = value.split(/\s+/).filter(Boolean);
    const deduped: string[] = [];
    for (const token of tokens) {
      if (!deduped.includes(token)) deduped.push(token);
    }
    return deduped.join(' ');
  }

  for (const cls of classes) {
    for (const d of WEEKDAYS) {
      const normalized = out[cls][d].map((lesson) => {
        if (lesson.subject || !lesson.detail) return lesson;
        const promoted = lesson.detail.trim();
        if (!promoted || isNoValue(promoted) || isRoomValue(promoted)) return lesson;
        return { ...lesson, subject: promoted, detail: undefined };
      });

      const filtered = normalized
        .map((lesson) => ({ ...lesson, subject: normalizeSubjectText(lesson.subject) }))
        .filter((l) => {
          if (!l.subject || l.subject === 'R' || isNoValue(l.subject)) return false;
          if (classSet.has(l.subject.toUpperCase().replace(/\s+/g, ''))) return false;
          if (TIME_RANGE_SUBJECT.test(l.subject) || PURE_NUMBER_SUBJECT.test(l.subject)) return false;
          return true;
        });

      for (const l of filtered) {
        if (l.detail && isNoValue(l.detail)) delete l.detail;
        if (l.room) {
          const cleaned = l.room.replace(/#(NV|N\/A|WERT!|REF!)/gi, '').replace(/\s+/g, ' ').trim();
          const dedupedRoom = dedupeTokenList(cleaned);
          if (dedupedRoom) l.room = dedupedRoom;
          else delete l.room;
        }
      }

      filtered.sort((a, b) => a.period - b.period);
      out[cls][d] = mergePeriodPairs(filtered);
    }
  }

  normalizeBlockSpecialEntries(out, dayPeriodTimes);

  return out;
}

/**
 * Parst den Dateinamen eines Stundenplan-PDFs und extrahiert Metadaten.
 */
export function parseTimetableFilename(filename: string): {
  kw: number;
  halfYear: number;
  yearStart: number;
  yearEndShort: number;
} | null {
  // Stundenplan_kw_XX_HjY_YYYY_YY.pdf
  const match = filename.match(/kw[_\s]*(\d{1,2})[_\s]*Hj[_\s]*(\d)[_\s]*(\d{4})[_\s]*(\d{2})/i);
  if (!match) return null;
  return {
    kw: Number(match[1]),
    halfYear: Number(match[2]),
    yearStart: Number(match[3]),
    yearEndShort: Number(match[4]),
  };
}
