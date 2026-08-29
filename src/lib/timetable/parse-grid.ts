/**
 * Den Stundenplan aus dem gezeichneten Tabellenraster lesen.
 *
 * Grundlage sind die echten Zellen des PDFs (siehe pdf-grid.ts), nicht die
 * Abstände zwischen Textschnipseln. Damit entscheidet — wie im Plan selbst —
 * die **Spalte** darüber, was eine Angabe ist: was in der Spalte unter „R"
 * steht, ist ein Raum; was in der Fachspalte steht, ist Fach oder Lehrkraft.
 *
 * Die Zellgrenzen beantworten außerdem drei Fragen, die aus dem Textbild
 * heraus nur zu raten waren:
 *
 * - **Welche Stunden gehören zusammen?** Die Raumspalte ist über die
 *   Doppelstunde verbunden — ihre Zelle sagt, wie weit die Stunde reicht.
 * - **Wo endet ein Tag?** Die Tagesspalte ist je Tag eine verbundene Zelle.
 * - **Für wen gilt ein Sondertermin?** Er steht in einer Zelle über mehrere
 *   Klassenspalten; welche das sind, sagen die fehlenden Trennlinien.
 */

import {
  isNoValue,
  isTeacherValue,
  joinCellLines,
  mergeTimeRange,
  normalizeTimeRange,
  stripNoValues,
  tidyRoom,
} from './cell-values';
import type { GridCell, TableGrid } from './pdf-grid';
import { LessonEntry, ParsedSchedule, Weekday, WeekPlan, WEEKDAYS } from './types';

const CLASS_PATTERN = /^[A-ZÄÖÜ]{1,5}\s?\d{1,2}[A-Z]?$/;
const PERIOD_PATTERN = /^(\d{1,2})\.$/;
const TIME_PATTERN = /\d{1,2}[.:]\d{2}/;
const DAY_SET = new Set<string>(WEEKDAYS);

export interface GridTextItem {
  str: string;
  x: number;
  y: number;
  width: number;
}

export interface GridParseResult {
  schedule: ParsedSchedule;
  warnings: string[];
  entries: number;
}

interface ClassColumns {
  cls: string;
  subject: number;
  room: number | null;
}

interface PeriodRow {
  period: number;
  time: string;
  top: number;
  bottom: number;
}

interface DayRange {
  day: Weekday;
  top: number;
  bottom: number;
}

function emptyWeek(): WeekPlan {
  return { MO: [], DI: [], MI: [], DO: [], FR: [] };
}

function centre(item: GridTextItem): number {
  return item.x + Math.max(item.width, 1) / 2;
}

/** Der Text einer Zelle, Zeile für Zeile von oben nach unten. */
function cellLines(cell: GridCell, items: GridTextItem[]): string[] {
  const inside = items.filter(
    (item) => {
      const x = centre(item);
      return x > cell.left && x < cell.right && item.y >= cell.bottom - 1 && item.y < cell.top - 0.5;
    },
  );
  if (inside.length === 0) return [];

  inside.sort((a, b) => b.y - a.y || a.x - b.x);
  const lines: string[] = [];
  let currentY = Number.NaN;
  for (const item of inside) {
    if (Number.isNaN(currentY) || Math.abs(currentY - item.y) > 2.5) {
      lines.push(item.str);
      currentY = item.y;
    } else {
      lines[lines.length - 1] = `${lines[lines.length - 1]} ${item.str}`;
    }
  }
  return lines;
}

function cellText(cell: GridCell, items: GridTextItem[]): string {
  return stripNoValues(joinCellLines(cellLines(cell, items)));
}

/** Zu welcher Spalte gehört ein x? */
function columnOf(columns: number[], x: number): number {
  for (let i = 0; i < columns.length - 1; i++) {
    if (x >= columns[i] && x < columns[i + 1]) return i;
  }
  return -1;
}

/**
 * Klassenspalten aus der Kopfzeile bestimmen: das Klassenkürzel steht über
 * seiner Fachspalte, das „R" über der zugehörigen Raumspalte.
 */
function detectClassColumns(grid: TableGrid, items: GridTextItem[], bodyTop: number): ClassColumns[] {
  const header = items.filter((item) => item.y >= bodyTop);

  const found = new Map<string, number>();
  for (const item of header) {
    const token = item.str.toUpperCase().replace(/\s+/g, '');
    if (!CLASS_PATTERN.test(item.str.toUpperCase())) continue;
    const column = columnOf(grid.columns, centre(item));
    if (column < 0 || found.has(token)) continue;
    found.set(token, column);
  }

  const roomColumns = new Set<number>();
  for (const item of header) {
    if (item.str.trim() !== 'R') continue;
    const column = columnOf(grid.columns, centre(item));
    if (column >= 0) roomColumns.add(column);
  }

  const classes = [...found.entries()]
    .map(([cls, subject]) => ({ cls, subject, room: null as number | null }))
    .sort((a, b) => a.subject - b.subject);

  for (let i = 0; i < classes.length; i++) {
    const limit = i + 1 < classes.length ? classes[i + 1].subject : grid.columns.length - 1;
    for (let column = classes[i].subject + 1; column < limit; column++) {
      if (roomColumns.has(column)) { classes[i].room = column; break; }
    }
    // Ohne „R" im Kopf: die nächste Spalte gilt als Raumspalte, wenn sie
    // deutlich schmaler ist als die Fachspalte.
    if (classes[i].room === null && limit === classes[i].subject + 2) {
      const subjectWidth = grid.columns[classes[i].subject + 1] - grid.columns[classes[i].subject];
      const nextWidth = grid.columns[limit] - grid.columns[limit - 1];
      if (nextWidth < subjectWidth * 0.6) classes[i].room = limit - 1;
    }
  }

  return classes;
}

/** Die Stundenzeilen aus der Zeit-/Stundenspalte links des Plans. */
function detectPeriodRows(
  grid: TableGrid,
  items: GridTextItem[],
  firstClassColumn: number,
): PeriodRow[] {
  let periodColumn = -1;
  let best = 0;

  for (let column = 0; column < firstClassColumn; column++) {
    const hits = grid
      .cellsInColumn(column)
      .filter((cell) => PERIOD_PATTERN.test(cellText(cell, items))).length;
    if (hits > best) { best = hits; periodColumn = column; }
  }
  if (periodColumn < 0) return [];

  const rows: PeriodRow[] = [];
  for (const cell of grid.cellsInColumn(periodColumn)) {
    const match = cellText(cell, items).match(PERIOD_PATTERN);
    if (!match) continue;

    // Die Uhrzeit steht rechts daneben, oft auf zwei Spalten verteilt
    // („8.00 -" und „8.45").
    const parts: string[] = [];
    for (let column = periodColumn + 1; column < firstClassColumn; column++) {
      for (const timeCell of grid.cellsInColumn(column)) {
        if (timeCell.bottom >= cell.top - 1 || timeCell.top <= cell.bottom + 1) continue;
        const text = cellText(timeCell, items);
        if (TIME_PATTERN.test(text)) parts.push(text);
      }
    }

    rows.push({
      period: Number(match[1]),
      time: normalizeTimeRange(parts.join(' ')),
      top: cell.top,
      bottom: cell.bottom,
    });
  }

  return rows.sort((a, b) => b.top - a.top);
}

/** Die Wochentage aus der Tagesspalte — dort ist jeder Tag eine Zelle. */
function detectDays(grid: TableGrid, items: GridTextItem[], firstClassColumn: number): DayRange[] {
  for (let column = 0; column < firstClassColumn; column++) {
    const days: DayRange[] = [];
    for (const cell of grid.cellsInColumn(column)) {
      const text = cellText(cell, items).toUpperCase();
      if (DAY_SET.has(text)) days.push({ day: text as Weekday, top: cell.top, bottom: cell.bottom });
    }
    if (days.length >= 2) return days.sort((a, b) => b.top - a.top);
  }
  return [];
}

/**
 * Hauptarbeit: für jede Klassenspalte die Zellen durchgehen und daraus
 * Stunden bauen.
 */
export function parseGridPage(
  grid: TableGrid,
  items: GridTextItem[],
  label: string,
): GridParseResult | null {
  const warnings: string[] = [];

  // Der Kopf endet dort, wo die erste Stundenzeile beginnt. Ohne Klassen im
  // Kopf ist das keine Stundenplanseite.
  const periodItems = items.filter((item) => PERIOD_PATTERN.test(item.str.trim()));
  const bodyTop = periodItems.length > 0 ? Math.max(...periodItems.map((item) => item.y)) + 4 : 0;

  const classes = detectClassColumns(grid, items, bodyTop);
  if (classes.length === 0) return null;

  const firstClassColumn = classes[0].subject;
  const periodRows = detectPeriodRows(grid, items, firstClassColumn);
  if (periodRows.length === 0) return null;

  const days = detectDays(grid, items, firstClassColumn);
  if (days.length === 0) {
    warnings.push(`${label}Keine Wochentagsspalte gefunden.`);
    return null;
  }

  const byClass = new Map<number, ClassColumns>();
  for (const entry of classes) byClass.set(entry.subject, entry);

  const missingRoomColumn = classes.filter((entry) => entry.room === null).map((entry) => entry.cls);
  if (missingRoomColumn.length > 0) {
    warnings.push(
      `${label}Keine Raumspalte erkannt für ${missingRoomColumn.join(', ')} — Räume fehlen dort möglicherweise.`,
    );
  }

  const schedule: ParsedSchedule = Object.fromEntries(
    classes.map((entry) => [entry.cls, emptyWeek()]),
  );

  /** Die Stunden, die eine Zelle der Höhe nach überdeckt — je Tag. */
  function periodsIn(top: number, bottom: number, day: DayRange): PeriodRow[] {
    return periodRows.filter((row) => {
      const rowCentre = (row.top + row.bottom) / 2;
      return rowCentre < top - 0.5 && rowCentre > bottom + 0.5
        && rowCentre < day.top - 0.5 && rowCentre > day.bottom + 0.5;
    });
  }

  /**
   * Eine Zelle der Fachspalte samt allem, was dazugehört.
   *
   * Unter dem Fach steht die Lehrkraft — im Plan zwei Zellen, im Ergebnis eine
   * Stunde.
   */
  interface Block {
    cell: GridCell;
    text: string;
    room: string;
    /** Untere Kante inklusive der Lehrerzeile. */
    bottom: number;
    teacher: string;
  }

  function readBlocks(entry: ClassColumns): Block[] {
    const roomCells = entry.room !== null ? grid.cellsInColumn(entry.room) : [];
    const findRoomCell = (y: number) =>
      roomCells.find((cell) => y < cell.top - 0.5 && y > cell.bottom + 0.5) ?? null;

    const cells = grid.cellsInColumn(entry.subject);
    const blocks: Block[] = [];

    for (let i = 0; i < cells.length; i++) {
      const cell = cells[i];
      const text = cellText(cell, items);
      if (!text || isNoValue(text)) continue;

      // Reicht die Zelle bis in die eigene Raumspalte, gibt es keinen
      // getrennten Raum — so stehen Sondertermine im Plan.
      const coversOwnRoom = entry.room !== null && cell.toColumn >= entry.room;
      const roomCell = coversOwnRoom ? null : findRoomCell((cell.top + cell.bottom) / 2);
      const room = roomCell ? tidyRoom(cellText(roomCell, items)) : '';

      const block: Block = { cell, text, room, bottom: cell.bottom, teacher: '' };

      const next = cells[i + 1];
      const nextText = next ? cellText(next, items) : '';

      // Gehört die Zeile darunter noch zu dieser Stunde?
      //
      // Sicher ja, wenn die Raumzelle über beide reicht — dann ist es dieselbe
      // Stunde. Die Raumspalte ist im Plan aber nicht durchgehend verbunden:
      // mal zieht sie sich über die Doppelstunde, mal steht die Nummer nur in
      // der oberen Zeile. Für diesen Fall zählt die Form der Zelle darunter:
      // eine Lehrerzeile steht allein in der Fachspalte, ein eigener Termin
      // reicht dagegen immer bis in die Raumspalte, weil er keinen Raum hat.
      const sharesRoomCell = !!next && !!roomCell
        && next.bottom >= roomCell.bottom - 0.5 && next.top <= roomCell.top + 0.5;

      const looksLikeTeacherLine = !!next
        && !!nextText
        && !isNoValue(nextText)
        && isTeacherValue(nextText)
        && !isTeacherValue(text)
        && Math.abs(next.top - cell.bottom) < 1.5
        && next.toColumn === next.fromColumn
        && cell.top - cell.bottom < (next.top - next.bottom) * 1.5
        && !tidyRoom(cellText(findRoomCell((next.top + next.bottom) / 2) ?? next, items));

      if (next && (sharesRoomCell || looksLikeTeacherLine)) {
        block.bottom = next.bottom;
        if (nextText && !isNoValue(nextText) && isTeacherValue(nextText)) block.teacher = nextText;
        i += 1;
      }

      blocks.push(block);
    }

    return blocks;
  }

  let entries = 0;

  for (const entry of classes) {
    for (const block of readBlocks(entry)) {
      // Für welche Klassen gilt die Zelle? Eine über mehrere Spalten verbundene
      // Zelle gilt für alle Klassen darin — so stehen gemeinsame Sondertermine
      // im Plan.
      const targets: string[] = [];
      for (let column = block.cell.fromColumn; column <= block.cell.toColumn; column++) {
        const owner = byClass.get(column);
        if (owner) targets.push(owner.cls);
      }
      if (targets.length === 0) targets.push(entry.cls);

      for (const day of days) {
        const covered = periodsIn(block.cell.top, block.bottom, day);
        if (covered.length === 0) continue;

        // `periodRows` läuft von oben nach unten, also von der ersten zur
        // letzten Stunde.
        const first = covered[0];
        const last = covered[covered.length - 1];
        const lesson: LessonEntry = {
          period: first.period,
          time: first === last ? first.time : mergeTimeRange(first.time, last.time),
          subject: block.text,
        };
        if (last.period > first.period) lesson.periodEnd = last.period;
        if (block.teacher) lesson.detail = block.teacher;
        if (block.room && !isNoValue(block.room)) lesson.room = block.room;

        for (const cls of targets) {
          schedule[cls][day.day].push({ ...lesson });
          entries += 1;
        }
      }
    }
  }

  for (const week of Object.values(schedule)) {
    for (const day of WEEKDAYS) week[day].sort((a, b) => a.period - b.period);
  }

  for (const entry of classes) {
    const total = WEEKDAYS.reduce((sum, day) => sum + schedule[entry.cls][day].length, 0);
    if (total === 0) warnings.push(`${label}Für ${entry.cls} wurde keine einzige Stunde erkannt.`);
  }

  if (entries === 0) return null;

  return { schedule, warnings, entries };
}
