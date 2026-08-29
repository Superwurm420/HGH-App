/**
 * Stundenplan-PDF-Parser.
 *
 * Läuft im Browser des Admins, nicht im Worker: Der kostenlose Workers-Plan
 * erlaubt 10 ms CPU-Zeit pro Request, und das Auswerten eines Stundenplan-PDFs
 * liegt weit darüber. Der Server nimmt deshalb nur noch das fertige Ergebnis
 * entgegen und prüft es (siehe src/server/services/schedule.ts).
 *
 * `getDocument` wird injiziert, damit die Funktion selbst keine pdfjs-Variante
 * festlegt und in Tests ohne echtes PDF geprüft werden kann.
 *
 * ── Zwei Wege ───────────────────────────────────────────────────────
 *
 * **1. Das gezeichnete Raster.** Der Plan ist ein Excel-Export, und Excel
 * zeichnet die Zellrahmen als Striche ins PDF. Daraus lässt sich die Tabelle
 * exakt zurückgewinnen: Spalten, Zeilen und vor allem **verbundene Zellen**.
 * Damit ist ohne Raten klar, was ein Raum ist (es steht in der Raumspalte),
 * welche Stunden zusammengehören (die Raumzelle reicht über beide), wo ein Tag
 * endet (die Tagesspalte ist je Tag eine Zelle) und für welche Klassen ein
 * Sondertermin gilt (seine Zelle reicht über deren Spalten). Siehe
 * `pdf-grid.ts` und `parse-grid.ts`.
 *
 * **2. Das Textbild.** Zeichnet ein PDF keine Tabelle, bleiben nur die
 * Textschnipsel mit ihren Koordinaten. Dann leitet der Parser das Raster aus
 * den senkrechten Lücken zwischen den Texten ab, trennt die Tage am Neustart
 * der Stundenzählung und entscheidet anhand der Zeile in der Zelle, was Fach
 * und was Lehrkraft ist. Das ist der Rückfall — ungenauer, aber es rettet den
 * Upload, wenn der Plan einmal anders exportiert wird.
 *
 * Was der Parser nicht sicher wissen kann, meldet er als Warnung zurück statt
 * es zu erraten — die Redaktion sieht das vor dem Hochladen.
 */

import {
  isNoValue,
  isRoomValue,
  isTeacherValue,
  joinCellText,
  mergeTimeRange,
  normalizeTimeRange,
  stripNoValues,
  tidyRoom,
} from './cell-values';
import { parseGridPage, type GridTextItem } from './parse-grid';
import { extractSegments, TableGrid, type PdfOperatorList, type PdfOperators } from './pdf-grid';
import { LessonEntry, ParsedSchedule, Weekday, WeekPlan, WEEKDAYS } from './types';

// ── Der Ausschnitt von pdfjs, den wir benutzen ──────────────────────

interface PdfTextItem {
  str?: string;
  transform?: number[];
  width?: number;
  height?: number;
}

interface PdfPage {
  getTextContent(): Promise<{ items: PdfTextItem[] }>;
  getOperatorList?(): Promise<PdfOperatorList>;
}

interface PdfDocument {
  numPages?: number;
  getPage(pageNumber: number): Promise<PdfPage>;
}

export type PdfGetDocument = (params: {
  data: Uint8Array;
  verbosity?: number;
}) => { promise: Promise<PdfDocument> };

export interface ParseOptions {
  verbosity?: number;
  /** `pdfjs.OPS` — ohne diese Werte lassen sich die Zeichenbefehle nicht deuten. */
  ops?: PdfOperators;
}

/** Ergebnis einer Auswertung — Plan plus alles, was unsicher blieb. */
export interface TimetableParseResult {
  schedule: ParsedSchedule;
  /** Für die Redaktion lesbare Hinweise auf unsichere Stellen. */
  warnings: string[];
  /** Wie viele Seiten das PDF hat und wie viele davon einen Plan enthielten. */
  pages: number;
  pagesWithSchedule: number;
  /** Wurde das gezeichnete Tabellenraster genutzt oder nur das Textbild? */
  source: 'raster' | 'textbild' | 'gemischt';
}

// ── Muster ──────────────────────────────────────────────────────────

const CLASS_PATTERN = /^[A-ZÄÖÜ]{1,5}\s?\d{1,2}[A-Z]?$/;
const DAY_SET = new Set<string>(WEEKDAYS);

/** „3. 9.50 - 11.20" am Anfang der Zeitspalte. */
const PERIOD_ROW_PATTERN = /^(\d{1,2})\.\s*(\d{1,2}[.:]\d{2})\s*[-–—]\s*(\d{1,2}[.:]\d{2})/;

const MAX_PAGES = 12;
const MAX_WARNINGS = 15;

// ── Geometrie: Zeilen und Spalten aus Koordinaten ───────────────────

interface TextItem {
  str: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface TextRow {
  y: number;
  items: TextItem[];
}

interface Interval {
  start: number;
  end: number;
}

function itemInterval(item: TextItem): Interval {
  return { start: item.x, end: item.x + Math.max(item.width, 1) };
}

function itemCenter(item: TextItem): number {
  return item.x + Math.max(item.width, 1) / 2;
}

function mergeIntervals(intervals: Interval[]): Interval[] {
  const sorted = [...intervals].sort((a, b) => a.start - b.start);
  const merged: Interval[] = [];
  for (const interval of sorted) {
    const last = merged[merged.length - 1];
    if (last && interval.start <= last.end) last.end = Math.max(last.end, interval.end);
    else merged.push({ ...interval });
  }
  return merged;
}

/** Alle senkrechten Lücken zwischen `from` und `to`, in denen kein Text liegt. */
function findGaps(intervals: Interval[], from: number, to: number): Interval[] {
  if (to <= from) return [];

  const clipped = mergeIntervals(
    intervals
      .filter((interval) => interval.end > from && interval.start < to)
      .map((interval) => ({
        start: Math.max(interval.start, from),
        end: Math.min(interval.end, to),
      })),
  );

  const gaps: Interval[] = [];
  let cursor = from;
  for (const interval of clipped) {
    if (interval.start > cursor) gaps.push({ start: cursor, end: interval.start });
    cursor = Math.max(cursor, interval.end);
  }
  if (to > cursor) gaps.push({ start: cursor, end: to });

  return gaps;
}

/** Die zusammenhängenden Textblöcke rechts von `from` — das sind die Spalten. */
function findColumns(intervals: Interval[], from: number): Interval[] {
  return mergeIntervals(intervals.filter((interval) => interval.end > from)).map((interval) => ({
    start: Math.max(interval.start, from),
    end: interval.end,
  }));
}

function buildRows(items: TextItem[]): TextRow[] {
  const heights = items.map((item) => item.height).filter((height) => height > 0).sort((a, b) => a - b);
  const medianHeight = heights.length > 0 ? heights[Math.floor(heights.length / 2)] : 0;
  const tolerance = medianHeight > 0 ? Math.min(4, Math.max(2, medianHeight * 0.35)) : 2.5;

  const rows: TextRow[] = [];
  for (const item of items) {
    const row = rows.find((candidate) => Math.abs(candidate.y - item.y) <= tolerance);
    if (row) row.items.push(item);
    else rows.push({ y: item.y, items: [item] });
  }

  rows.sort((a, b) => b.y - a.y);
  for (const row of rows) row.items.sort((a, b) => a.x - b.x);
  return rows;
}

// ── Spaltenmodell einer Seite ───────────────────────────────────────

interface ClassGroup {
  cls: string;
  /** Linke Kante der Spaltengruppe (Fach + Raum). */
  left: number;
  /** Rechte Kante der Spaltengruppe. */
  right: number;
  /** Mitte der Fachspalte — für die Zuordnung von Text außerhalb aller Gruppen. */
  center: number;
  /** Ab hier beginnt die Raumspalte, `null` wenn keine erkannt wurde. */
  roomLeft: number | null;
}

interface ClassAnchor {
  cls: string;
  x: number;
  center: number;
}

/**
 * Klassenkürzel in den Kopfzeilen finden.
 * `minX` hält die Zeitspalte heraus, `aboveY` begrenzt auf den Kopfbereich.
 */
function detectClassAnchors(rows: TextRow[], aboveY: number, minX: number): ClassAnchor[] {
  const found = new Map<string, ClassAnchor>();

  for (const row of rows) {
    if (row.y < aboveY) continue;
    for (const item of row.items) {
      if (item.x < minX) continue;
      if (!CLASS_PATTERN.test(item.str.toUpperCase())) continue;
      const cls = item.str.toUpperCase().replace(/\s+/g, '');
      if (!found.has(cls)) {
        found.set(cls, { cls, x: item.x, center: itemCenter(item) });
      }
    }
  }

  return [...found.values()].sort((a, b) => a.center - b.center);
}

/**
 * Prüft, ob eine Spalte wie eine Raumspalte aussieht: kurze Einträge, die
 * mehrheitlich Raumkürzel sind.
 */
function roomLikeShare(items: TextItem[]): number {
  const usable = items.filter((item) => !isNoValue(item.str));
  if (usable.length === 0) return 0;
  const roomLike = usable.filter((item) => isRoomValue(item.str)).length;
  return roomLike / usable.length;
}

/**
 * Ordnet die erkannten Textspalten den Klassen zu und bestimmt je Gruppe die
 * Raumspalte.
 *
 * Der Kopf hilft dabei nur noch als Hinweis — verlassen wird sich auf das
 * Textbild des Plans selbst.
 */
function buildClassGroups(
  anchors: ClassAnchor[],
  columns: Interval[],
  bodyItems: TextItem[],
  timeColBoundary: number,
  rightEdge: number,
): ClassGroup[] {
  if (anchors.length === 0) return [];

  // Jede Textspalte gehört zu der Klasse, deren Beschriftung ihr am nächsten
  // steht. Das kommt ohne Annahme darüber aus, wie viele Teilspalten eine
  // Klasse hat — und eine Klasse ganz ohne Unterricht in dieser Woche reißt
  // damit auch keine Lücke, die die Nachbarn verschiebt.
  const owned: number[][] = anchors.map(() => []);
  columns.forEach((column, index) => {
    const center = (column.start + column.end) / 2;
    let best = 0;
    for (let i = 1; i < anchors.length; i++) {
      if (Math.abs(center - anchors[i].center) < Math.abs(center - anchors[best].center)) best = i;
    }
    owned[best].push(index);
  });

  const groups: ClassGroup[] = anchors.map((anchor, i) => {
    const own = owned[i];
    if (own.length === 0) {
      // Keine Spalte — diese Klasse hat auf der Seite nichts stehen.
      return { cls: anchor.cls, left: anchor.center, right: anchor.center, center: anchor.center, roomLeft: null };
    }
    return {
      cls: anchor.cls,
      left: columns[own[0]].start - 2,
      right: columns[own[own.length - 1]].end + 2,
      center: anchor.center,
      roomLeft: null,
    };
  });

  groups[0].left = Math.min(groups[0].left, timeColBoundary);
  if (owned[groups.length - 1].length > 0) {
    groups[groups.length - 1].right = Math.max(groups[groups.length - 1].right, rightEdge);
  }

  // Lücken zwischen zwei Gruppen halbieren, damit kein Text ins Nichts fällt.
  for (let i = 0; i < groups.length - 1; i++) {
    const boundary = (Math.max(groups[i].right, groups[i].left) + groups[i + 1].left) / 2;
    groups[i].right = Math.max(boundary, groups[i].left);
    groups[i + 1].left = Math.min(boundary, groups[i + 1].right);
  }

  // Raumspalte je Gruppe: die rechteste Teilspalte, die überwiegend Räume trägt.
  for (const group of groups) {
    const groupItems = bodyItems.filter((item) => {
      const center = itemCenter(item);
      return center >= group.left && center < group.right;
    });
    if (groupItems.length < 4) continue;

    const gaps = findGaps(groupItems.map(itemInterval), group.left, group.right)
      .filter((gap) => gap.end - gap.start >= 2)
      .sort((a, b) => b.start - a.start);

    for (const gap of gaps) {
      const boundary = (gap.start + gap.end) / 2;
      const rightItems = groupItems.filter((item) => itemCenter(item) >= boundary);
      const leftItems = groupItems.filter((item) => itemCenter(item) < boundary);
      if (rightItems.length < 2 || leftItems.length < 2) continue;

      const rightShare = roomLikeShare(rightItems);
      const leftShare = roomLikeShare(leftItems);
      if (rightShare >= 0.6 && rightShare > leftShare) {
        group.roomLeft = boundary;
        break;
      }
    }
  }

  return groups;
}

// ── Tage und Stundenfelder ──────────────────────────────────────────

interface PeriodRow {
  y: number;
  period: number;
  time: string;
}

interface DaySection {
  day: Weekday;
  startY: number;
  endY: number;
  slots: PeriodRow[];
}

/**
 * Tage trennen, wo die Stundenzählung neu beginnt.
 *
 * Früher wurde dafür eine Zeile mit „1." und „8.00" verlangt. Ein Tag, der
 * erst zur 3. Stunde anfängt — oder ein Plan mit anderem Schulbeginn — hatte
 * damit keinen Abschnitt und fiel komplett aus dem Ergebnis.
 */
function buildDaySections(
  periodRows: PeriodRow[],
  dayMarkers: Array<{ y: number; day: string }>,
): { sections: DaySection[]; extra: number } {
  if (periodRows.length === 0) return { sections: [], extra: 0 };

  const starts: number[] = [0];
  for (let i = 1; i < periodRows.length; i++) {
    if (periodRows[i].period <= periodRows[i - 1].period) starts.push(i);
  }

  const sections = starts.map((startIndex, i) => {
    const endIndex = i < starts.length - 1 ? starts[i + 1] : periodRows.length;
    const slots = periodRows.slice(startIndex, endIndex);
    return {
      day: null as Weekday | null,
      startY: slots[0].y,
      endY: i < starts.length - 1 ? periodRows[starts[i + 1]].y + 3 : -Infinity,
      slots,
    };
  });

  // Benennung aus den Wochentagskürzeln im Plan; sie stehen irgendwo im
  // Abschnitt, nicht zwingend in dessen erster Zeile.
  const taken = new Set<string>();
  const named = new Map<number, Weekday>();

  for (const marker of dayMarkers) {
    const index = sections.findIndex((section) => marker.y <= section.startY + 5 && marker.y > section.endY);
    if (index < 0 || named.has(index) || taken.has(marker.day)) continue;
    named.set(index, marker.day as Weekday);
    taken.add(marker.day);
  }

  // Abschnitte ohne eigenes Kürzel bekommen der Reihe nach die noch freien
  // Wochentage. Bleibt keiner übrig, ist der Abschnitt kein Wochentag —
  // dann lieber weglassen als einen Tag doppelt zu belegen.
  const remaining = WEEKDAYS.filter((day) => !taken.has(day));
  for (let i = 0; i < sections.length; i++) {
    sections[i].day = named.get(i) ?? remaining.shift() ?? null;
  }

  const usable = sections.filter((section): section is DaySection => section.day !== null);
  return { sections: usable, extra: sections.length - usable.length };
}

// ── Zelleninhalte einsammeln ────────────────────────────────────────

interface Cell {
  period: number;
  time: string;
  /** Text aus der Fachspalte, zeilenweise. */
  texts: string[];
  /** Text aus der Raumspalte. */
  rooms: string[];
}

function emptyWeek(): WeekPlan {
  return { MO: [], DI: [], MI: [], DO: [], FR: [] };
}

/**
 * Der aufbereitete Inhalt eines Stundenfelds.
 *
 * Ob ein Kürzel eine Lehrkraft ist, steht hier bewusst noch nicht fest: „CAD"
 * und „STI" sehen gleich aus. Erst die Zeile entscheidet — das Fach steht in
 * der ersten Zeile der Zelle, die Lehrkraft darunter.
 */
interface CellValues {
  text?: string;
  room?: string;
}

function readCell(cell: Cell, hasRoomColumn: boolean): CellValues {
  let text = stripNoValues(cell.texts.join(' '));
  let room = stripNoValues(cell.rooms.join(' '));

  // Ohne eigene Raumspalte bleibt nur der Rückfall: ein Raumkürzel am Anfang
  // oder Ende des Zelltexts abtrennen.
  if (!hasRoomColumn && !room && text) {
    const tokens = text.split(/\s+/);
    if (tokens.length > 1 && isRoomValue(tokens[tokens.length - 1]) && !isTeacherValue(text)) {
      room = tokens.pop()!;
      text = tokens.join(' ');
    } else if (tokens.length > 1 && isRoomValue(tokens[0]) && !isTeacherValue(text)) {
      room = tokens.shift()!;
      text = tokens.join(' ');
    }
  }

  if (room) room = tidyRoom(room);

  return { text: text || undefined, room: room || undefined };
}

/**
 * Legt die beiden Zeilen einer Doppelstunde zusammen.
 *
 * Im Plan steht das Fach in der ersten, das Lehrerkürzel in der zweiten Zeile
 * derselben verbundenen Zelle. Bisher wurde nur zusammengelegt, wenn die
 * zweite Zeile exakt wie ein Lehrerkürzel aussah — Zellen mit umgebrochenem
 * Text („Freihandzeichnen-Aufgabe" / „ohne Lehrer") blieben deshalb als zwei
 * Stunden stehen. Jetzt zählt zusätzlich, ob die zweite Zeile einen eigenen
 * Raum mitbringt: ohne eigenen Raum ist sie die Fortsetzung der ersten.
 */
function mergeLessonPairs(
  cells: Array<{ period: number; time: string; values: CellValues }>,
): LessonEntry[] {
  const sorted = [...cells].sort((a, b) => a.period - b.period);
  const result: LessonEntry[] = [];

  for (let i = 0; i < sorted.length; i++) {
    const current = sorted[i];
    const next = sorted[i + 1];

    if (!current.values.text && !current.values.room) continue;

    const nextHasText = !!next?.values.text;
    const isPair = !!next && next.period === current.period + 1 && current.period % 2 === 1;
    // Erst zwei verschiedene Räume sind ein Beleg für zwei getrennte Zellen.
    // Fehlt einer der beiden, steht die Raumnummer nur mittig in einer
    // verbundenen Zelle und ist mal auf der oberen, mal auf der unteren Zeile
    // gelandet.
    const nextRoomFits = !!next
      && (!next.values.room || !current.values.room || next.values.room === current.values.room);

    if (isPair && nextHasText && nextRoomFits) {
      // Die zweite Zeile ist die Lehrkraft, wenn sie wie ein Kürzel aussieht
      // und darüber ein Fach steht. Sonst ist sie die Fortsetzung des Fachs.
      const secondIsTeacher = !!current.values.text && isTeacherValue(next.values.text!);
      const subject = secondIsTeacher
        ? current.values.text
        : joinCellText(current.values.text ?? '', next.values.text ?? '');

      result.push({
        period: current.period,
        periodEnd: next.period,
        time: mergeTimeRange(current.time, next.time),
        ...(subject ? { subject } : {}),
        ...(secondIsTeacher ? { detail: next.values.text } : {}),
        ...(current.values.room || next.values.room
          ? { room: current.values.room ?? next.values.room }
          : {}),
      });
      i += 1;
      continue;
    }

    // Einzelne Zeile: ein alleinstehendes Kürzel ist hier kein Lehrername,
    // sondern der einzige Inhalt der Zelle — also das Fach.
    result.push({
      period: current.period,
      time: current.time,
      ...(current.values.text ? { subject: current.values.text } : {}),
      ...(current.values.room ? { room: current.values.room } : {}),
    });
  }

  return result;
}

// ── Blockveranstaltungen ────────────────────────────────────────────

function sanitizeSubject(subject: string): string {
  return subject.replace(/["„“”'`]/g, '').replace(/\s+/g, ' ').trim();
}

/**
 * Setzt den Text einer verbundenen Zelle wieder zusammen. Solche Zellen brechen
 * ihren Text über mehrere Zeilen um, oft mit Trennstrich
 * („UNTERNEHMENS-" / „PROJEKT").
 */
function buildBlockTitle(parts: string[]): string | null {
  const tokens = parts.map(sanitizeSubject).filter(Boolean);
  if (tokens.length === 0) return null;

  const deduped: string[] = [];
  for (const token of tokens) {
    if (deduped.length === 0 || deduped[deduped.length - 1] !== token) deduped.push(token);
  }

  let title = '';
  for (const token of deduped) title = joinCellText(title, token);

  // In einem Blocktitel ist ein Trennstrich vor einem Leerzeichen immer ein
  // Umbruch, auch wenn beide Hälften schon vorher zusammengelegt wurden.
  return title.replace(/(\S)-\s+/g, '$1').replace(/\s+/g, ' ').trim() || null;
}

/**
 * Erkennt Tage, an denen eine Klasse nicht Unterricht nach Plan hat, sondern
 * eine durchgehende Veranstaltung (Praktikum, Projektwoche). Im PDF ist das
 * eine über den ganzen Tag verbundene Zelle; pdfjs liefert davon nur die
 * einzelnen Textzeilen an verstreuten Höhen.
 *
 * Die frühere Fassung schlug schon zu, wenn im ganzen Plan kein Lehrerkürzel
 * vorkam — ein Plan ohne Lehrerspalte wurde dadurch vollständig zu einem
 * einzigen zusammengeklebten Titel je Tag. Jetzt zählt nur der einzelne Tag,
 * und nur wenn der Plan sonst sehr wohl Lehrer- oder Raumangaben hat.
 */
function foldDayBlocks(
  entries: LessonEntry[],
  slots: PeriodRow[],
  planHasDetails: boolean,
): LessonEntry[] {
  if (!planHasDetails || entries.length < 2 || slots.length === 0) return entries;
  if (entries.some((entry) => entry.detail || entry.room)) return entries;

  const title = buildBlockTitle(entries.map((entry) => entry.subject ?? ''));
  if (!title || title.length < 4) return entries;

  const periods = slots.map((slot) => slot.period).sort((a, b) => a - b);
  const first = periods[0];
  const last = periods[periods.length - 1];

  return [{
    period: first,
    periodEnd: last > first ? last : undefined,
    time: mergeTimeRange(
      slots.find((slot) => slot.period === first)!.time,
      slots.find((slot) => slot.period === last)!.time,
    ),
    subject: title,
  }];
}

// ── Auswertung einer Seite ──────────────────────────────────────────

interface PageResult {
  schedule: ParsedSchedule;
  warnings: string[];
  hasSchedule: boolean;
}

function parsePage(items: TextItem[], pageNumber: number, totalPages: number): PageResult {
  const warnings: string[] = [];
  const label = totalPages > 1 ? `Seite ${pageNumber}: ` : '';
  const empty: PageResult = { schedule: {}, warnings, hasSchedule: false };

  const rows = buildRows(items);
  if (rows.length === 0) return empty;

  const pageTop = rows[0].y;
  const pageBottom = rows[rows.length - 1].y;
  const rightEdge = Math.max(...items.map((item) => item.x + Math.max(item.width, 1))) + 4;

  // ── Stundenzeilen zuerst, ohne jede Annahme über Spalten ──
  // Damit steht fest, wo der Kopf aufhört; die Spaltengrenzen kommen danach.
  const matchPeriodRow = (row: TextRow): PeriodRow | null => {
    const tokens = row.items.map((item) => item.str);
    const start = tokens.length > 0 && DAY_SET.has(tokens[0]) ? 1 : 0;
    const leading = tokens.slice(start, start + 4).join(' ').replace(/\s+/g, ' ').trim();
    const match = leading.match(PERIOD_ROW_PATTERN);
    if (!match) return null;
    return {
      y: row.y,
      period: Number(match[1]),
      time: normalizeTimeRange(`${match[2]} - ${match[3]}`),
    };
  };

  const periodRows = rows
    .map(matchPeriodRow)
    .filter((entry): entry is PeriodRow => entry !== null);

  if (periodRows.length === 0) {
    warnings.push(`${label}Keine Stundenzeilen gefunden („1. 8.00 - 8.45").`);
    return { schedule: {}, warnings, hasSchedule: false };
  }

  // ── Klassen im Kopf, also oberhalb der ersten Stundenzeile ──
  const headerBottom = periodRows[0].y + 3;
  const headerFallback = pageTop - Math.max(120, (pageTop - pageBottom) * 0.15);
  let anchors = detectClassAnchors(rows, headerBottom, 40);
  if (anchors.length === 0) anchors = detectClassAnchors(rows, headerFallback, 40);
  if (anchors.length === 0) return empty;

  // ── Spaltenmodell aus dem Textbild ──
  // Grundlage sind die senkrechten Lücken zwischen den Texten. Verbundene
  // Zellen über mehrere Klassen und die Pausenzeile würden Spalten
  // zusammenkleben und bleiben deshalb außen vor.
  const bodyRows = rows.filter((row) => row.y < headerBottom);
  const anchorGaps = anchors
    .slice(1)
    .map((anchor, index) => anchor.center - anchors[index].center)
    .sort((a, b) => a - b);
  const estimatedGroupWidth = anchorGaps.length > 0
    ? anchorGaps[Math.floor(anchorGaps.length / 2)]
    : Math.max(rightEdge - anchors[0].center, 60);

  const columnItems = bodyRows
    .filter((row) => !row.items.some((item) => /Mittagspause|Mittag$/i.test(item.str)))
    .flatMap((row) => row.items)
    .filter((item) => Math.max(item.width, 1) <= estimatedGroupWidth * 0.9);

  const allColumns = findColumns(columnItems.map(itemInterval), 0);

  // Die Spalte der ersten Klasse trennt Zeitspalte und Plan.
  const firstClassColumn = allColumns.findIndex(
    (column) => anchors[0].center >= column.start - 2 && anchors[0].center <= column.end + 2,
  );

  let timeColBoundary: number;
  if (firstClassColumn > 0) {
    timeColBoundary = (allColumns[firstClassColumn - 1].end + allColumns[firstClassColumn].start) / 2;
  } else if (firstClassColumn === 0) {
    timeColBoundary = Math.max(allColumns[0].start - 2, 0);
  } else {
    timeColBoundary = Math.max(Math.round(anchors[0].x * 0.65), 40);
  }

  const columns = allColumns.filter((column) => column.end > timeColBoundary);
  const gridItems = columnItems.filter((item) => itemCenter(item) >= timeColBoundary);
  const groups = buildClassGroups(anchors, columns, gridItems, timeColBoundary, rightEdge);

  // ── Tage ──
  const dayMarkers = rows
    .map((row) => {
      const token = row.items.find((item) => item.x < timeColBoundary && DAY_SET.has(item.str))?.str;
      return token ? { y: row.y, day: token } : null;
    })
    .filter((marker): marker is { y: number; day: string } => marker !== null);

  const { sections, extra } = buildDaySections(periodRows, dayMarkers);
  if (extra > 0) {
    warnings.push(
      `${label}${extra} Tagesabschnitte mehr als Wochentage gefunden — der Rest wurde nicht übernommen.`,
    );
  }
  if (dayMarkers.length === 0) {
    warnings.push(`${label}Keine Wochentagskürzel gefunden — die Tage wurden der Reihe nach zugeordnet.`);
  }

  // ── Zellen füllen ──
  const cells = new Map<string, Cell>();
  const cellKey = (cls: string, day: Weekday, period: number) => `${cls}|${day}|${period}`;

  for (const section of sections) {
    for (const slot of section.slots) {
      for (const group of groups) {
        cells.set(cellKey(group.cls, section.day, slot.period), {
          period: slot.period,
          time: slot.time,
          texts: [],
          rooms: [],
        });
      }
    }
  }

  let unassigned = 0;

  for (const row of bodyRows) {
    const section = sections.find((candidate) => row.y <= candidate.startY + 5 && row.y > candidate.endY);
    if (!section) continue;

    // Die Zeile gehört zu dem Stundenfeld, das über ihr beginnt.
    const slot = section.slots.reduce<PeriodRow | null>((best, candidate) => {
      if (candidate.y < row.y - 1) return best;
      if (!best || candidate.y < best.y) return candidate;
      return best;
    }, null);
    if (!slot) continue;

    if (row.items.some((item) => item.x < timeColBoundary && item.str.includes('Mittagspause'))) continue;

    for (const item of row.items) {
      if (item.x < timeColBoundary) continue;
      if (isNoValue(item.str)) continue;

      const interval = itemInterval(item);
      const center = itemCenter(item);

      // Eine über mehrere Klassen verbundene Zelle: der Text liegt merklich in
      // mehr als einer Gruppe.
      const overlapping = groups.filter((group) => {
        const overlap = Math.min(interval.end, group.right) - Math.max(interval.start, group.left);
        return overlap > Math.min(15, (group.right - group.left) * 0.25);
      });

      const targets = overlapping.length > 1
        ? overlapping
        : (() => {
          const containing = groups.find((group) => center >= group.left && center < group.right);
          if (containing) return [containing];
          const nearest = groups.reduce<ClassGroup | null>((best, group) => {
            if (!best) return group;
            return Math.abs(center - group.center) < Math.abs(center - best.center) ? group : best;
          }, null);
          if (!nearest) return [];
          if (Math.abs(center - nearest.center) > (nearest.right - nearest.left)) {
            unassigned += 1;
            return [];
          }
          return [nearest];
        })();

      for (const group of targets) {
        const cell = cells.get(cellKey(group.cls, section.day, slot.period));
        if (!cell) continue;
        if (group.roomLeft !== null && center >= group.roomLeft && overlapping.length <= 1) {
          cell.rooms.push(item.str);
        } else {
          cell.texts.push(item.str);
        }
      }
    }
  }

  if (unassigned > 0) {
    warnings.push(`${label}${unassigned} Textstellen ließen sich keiner Klassenspalte zuordnen.`);
  }

  // ── Zellen zu Stunden ──
  const schedule: ParsedSchedule = Object.fromEntries(
    groups.map((group) => [group.cls, emptyWeek()]),
  );

  const classCodes = new Set(groups.map((group) => group.cls));
  const knownTeachers = new Set<string>();
  const readCells = new Map<string, CellValues>();

  for (const group of groups) {
    for (const section of sections) {
      for (const slot of section.slots) {
        const key = cellKey(group.cls, section.day, slot.period);
        const cell = cells.get(key);
        if (!cell) continue;
        const values = readCell(cell, group.roomLeft !== null);
        readCells.set(key, values);
        // Ein Kürzel unter einer gefüllten Zelle ist mit hoher Sicherheit eine
        // Lehrkraft — daraus lernen wir die Kürzel dieses Plans.
        if (values.text && slot.period % 2 === 0 && isTeacherValue(values.text)) {
          const above = readCells.get(cellKey(group.cls, section.day, slot.period - 1));
          if (above?.text) knownTeachers.add(values.text);
        }
      }
    }
  }

  const planHasDetails = knownTeachers.size > 0
    || [...readCells.values()].some((values) => values.room);

  let orphanTeachers = 0;
  let entryCount = 0;

  for (const group of groups) {
    for (const section of sections) {
      const dayCells = section.slots.map((slot) => ({
        period: slot.period,
        time: slot.time,
        values: readCells.get(cellKey(group.cls, section.day, slot.period)) ?? {},
      }));

      for (const cell of dayCells) {
        if (cell.values.text && knownTeachers.has(cell.values.text)) {
          const partner = dayCells.find((candidate) => candidate.period === cell.period - 1);
          if (!partner?.values.text) orphanTeachers += 1;
        }
      }

      const merged = mergeLessonPairs(dayCells);

      const cleaned = merged
        .map((entry) => ({ ...entry, subject: stripNoValues(entry.subject ?? '') || undefined }))
        .filter((entry) => {
          if (!entry.subject) return false;
          if (entry.subject === 'R' || isNoValue(entry.subject)) return false;
          if (classCodes.has(entry.subject.toUpperCase().replace(/\s+/g, ''))) return false;
          if (/^\d{1,2}[.:]\d{2}\s*-\s*\d{1,2}[.:]\d{2}/.test(entry.subject)) return false;
          if (/^\d{1,3}$/.test(entry.subject)) return false;
          return true;
        });

      const folded = foldDayBlocks(cleaned, section.slots, planHasDetails);
      entryCount += folded.length;
      schedule[group.cls][section.day] = folded;
    }
  }

  if (orphanTeachers > 0) {
    warnings.push(
      `${label}${orphanTeachers} Lehrerkürzel stehen ohne Fach im Plan — sie wurden als Fach übernommen.`,
    );
  }

  // Eine Klasse mit ganz normalem Unterricht, aber ohne einen einzigen Raum,
  // während andere Klassen Räume haben: dann ist die Raumspalte danebengegangen
  // und die Nummern stecken vermutlich im Fachnamen.
  const roomsPerClass = new Map<string, number>();
  for (const group of groups) {
    const lessons = WEEKDAYS.flatMap((day) => schedule[group.cls][day]);
    roomsPerClass.set(group.cls, lessons.filter((lesson) => lesson.room).length);

    if (lessons.length === 0) {
      warnings.push(`${label}Für ${group.cls} wurde keine einzige Stunde erkannt.`);
    }
  }

  const anyRooms = [...roomsPerClass.values()].some((count) => count > 0);
  if (anyRooms) {
    const missing = groups
      .map((group) => group.cls)
      .filter((cls) => roomsPerClass.get(cls) === 0
        && WEEKDAYS.flatMap((day) => schedule[cls][day]).filter((lesson) => lesson.detail).length >= 3);

    if (missing.length > 0) {
      warnings.push(
        `${label}Für ${missing.join(', ')} wurde kein einziger Raum erkannt — die Raumnummern könnten im Fachnamen stehen.`,
      );
    }
  }

  return { schedule, warnings, hasSchedule: entryCount > 0 };
}

// ── Öffentliche Schnittstelle ───────────────────────────────────────

function mergeSchedules(target: ParsedSchedule, source: ParsedSchedule): void {
  for (const [cls, week] of Object.entries(source)) {
    const existing = target[cls] ?? emptyWeek();
    for (const day of WEEKDAYS) {
      const incoming = week[day] ?? [];
      if (incoming.length === 0) continue;
      const taken = new Set(existing[day].map((entry) => entry.period));
      for (const entry of incoming) {
        if (taken.has(entry.period)) continue;
        existing[day].push(entry);
        taken.add(entry.period);
      }
      existing[day].sort((a, b) => a.period - b.period);
    }
    target[cls] = existing;
  }
}

/**
 * Parst ein Stundenplan-PDF aus einem ArrayBuffer.
 * Erwartet pdfjs-dist als externe Dependency (getDocument, VerbosityLevel).
 *
 * Es werden alle Seiten ausgewertet und zusammengeführt — bisher nur die erste,
 * womit ein zweiseitiger Plan zur Hälfte still verschwand.
 */
export async function parseTimetablePdf(
  pdfData: ArrayBuffer,
  getDocument: PdfGetDocument,
  options: ParseOptions = {},
): Promise<TimetableParseResult> {
  const data = new Uint8Array(pdfData);
  const doc = await getDocument({ data, verbosity: options.verbosity ?? 0 }).promise;

  const pages = Math.max(1, Math.min(doc.numPages ?? 1, MAX_PAGES));
  const schedule: ParsedSchedule = {};
  const warnings: string[] = [];
  let pagesWithSchedule = 0;
  let gridPages = 0;
  let textPages = 0;

  for (let pageNumber = 1; pageNumber <= pages; pageNumber++) {
    const page = await doc.getPage(pageNumber);
    const content = await page.getTextContent();
    const label = pages > 1 ? `Seite ${pageNumber}: ` : '';

    const items: TextItem[] = content.items
      .map((item) => ({
        str: (item.str || '').trim(),
        x: item.transform?.[4] ?? 0,
        y: item.transform?.[5] ?? 0,
        width: item.width ?? 0,
        height: item.height ?? Math.abs(item.transform?.[3] ?? 0),
      }))
      .filter((item) => item.str)
      .sort((a, b) => b.y - a.y || a.x - b.x);

    if (items.length === 0) continue;

    // Zuerst das gezeichnete Raster — nur wenn das PDF keines hergibt, wird
    // aus dem Textbild geschätzt.
    const fromGrid = await readGrid(page, items as GridTextItem[], label, options.ops);
    if (fromGrid) {
      gridPages += 1;
      pagesWithSchedule += 1;
      warnings.push(...fromGrid.warnings);
      mergeSchedules(schedule, fromGrid.schedule);
      continue;
    }

    const result = parsePage(items, pageNumber, pages);
    warnings.push(...result.warnings);
    if (result.hasSchedule) {
      textPages += 1;
      pagesWithSchedule += 1;
      mergeSchedules(schedule, result.schedule);
    }
  }

  if (Object.keys(schedule).length === 0) {
    throw new Error(
      pages > 1
        ? 'Auf keiner Seite des PDFs wurden Klassenspalten mit Stunden erkannt.'
        : 'Keine Klassen im PDF-Header erkannt.',
    );
  }

  if (pages > 1 && pagesWithSchedule < pages) {
    warnings.push(`${pages - pagesWithSchedule} von ${pages} Seiten enthielten keinen Stundenplan.`);
  }
  if (textPages > 0 && gridPages === 0) {
    warnings.push(
      'Das PDF enthält keine gezeichnete Tabelle — der Plan wurde aus der Lage der Texte geschätzt. Bitte besonders sorgfältig prüfen.',
    );
  }

  return {
    schedule,
    warnings: warnings.slice(0, MAX_WARNINGS),
    pages,
    pagesWithSchedule,
    source: gridPages > 0 && textPages > 0 ? 'gemischt' : gridPages > 0 ? 'raster' : 'textbild',
  };
}

/** Versucht, die Seite über ihr gezeichnetes Tabellenraster zu lesen. */
async function readGrid(
  page: PdfPage,
  items: GridTextItem[],
  label: string,
  ops?: PdfOperators,
): Promise<{ schedule: ParsedSchedule; warnings: string[] } | null> {
  if (!ops || typeof page.getOperatorList !== 'function') return null;

  try {
    const list = await page.getOperatorList();
    const grid = TableGrid.fromSegments(extractSegments(list, ops));
    if (!grid) return null;

    const result = parseGridPage(grid, items, label);
    return result ? { schedule: result.schedule, warnings: result.warnings } : null;
  } catch {
    // Ein unbekanntes Format der Zeichenbefehle darf den Upload nicht kippen —
    // dann eben über das Textbild.
    return null;
  }
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
