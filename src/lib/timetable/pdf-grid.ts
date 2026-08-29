/**
 * Das Tabellenraster aus der Zeichnung des PDFs lesen.
 *
 * Der Stundenplan ist eine gezeichnete Tabelle: Excel exportiert die
 * Zellrahmen als Striche. pdfjs liefert sie über `getOperatorList()`. Damit
 * muss der Parser das Raster nicht mehr aus den Textabständen erraten — er
 * liest die Spalten- und Zeilenkanten dort ab, wo sie tatsächlich gezogen
 * wurden.
 *
 * Das ist auch die einzige verlässliche Quelle für **verbundene Zellen**: Ein
 * Sondertermin, der für HT21 und HT22 zusammen gilt, ist im PDF eine Zelle
 * über beide Spalten — erkennbar daran, dass die Trennlinie dazwischen auf
 * dieser Höhe fehlt. Aus dem Textbild allein wäre das nicht zu sehen.
 */

export interface Segment {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

/** Die Zeichenbefehle, die wir aus pdfjs brauchen. */
export interface PdfOperatorList {
  fnArray: number[];
  argsArray: unknown[];
}

/** Die Werte aus `pdfjs.OPS`, die wir auswerten. */
export interface PdfOperators {
  constructPath?: number;
  transform?: number;
  save?: number;
  restore?: number;
  moveTo?: number;
  lineTo?: number;
  curveTo?: number;
  closePath?: number;
  rectangle?: number;
}

type Matrix = [number, number, number, number, number, number];

const IDENTITY: Matrix = [1, 0, 0, 1, 0, 0];

function multiply(a: Matrix, b: Matrix): Matrix {
  return [
    a[0] * b[0] + a[2] * b[1],
    a[1] * b[0] + a[3] * b[1],
    a[0] * b[2] + a[2] * b[3],
    a[1] * b[2] + a[3] * b[3],
    a[0] * b[4] + a[2] * b[5] + a[4],
    a[1] * b[4] + a[3] * b[5] + a[5],
  ];
}

function apply(m: Matrix, x: number, y: number): [number, number] {
  return [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
}

function toNumbers(value: unknown): number[] | null {
  if (!value) return null;
  if (Array.isArray(value)) return value.every((entry) => typeof entry === 'number') ? value : null;
  if (ArrayBuffer.isView(value)) return Array.from(value as unknown as ArrayLike<number>);
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const length = typeof record.length === 'number' ? record.length : Object.keys(record).length;
    if (!length) return null;
    const out: number[] = [];
    for (let i = 0; i < length; i++) {
      const entry = record[i];
      if (typeof entry !== 'number') return null;
      out.push(entry);
    }
    return out;
  }
  return null;
}

/**
 * Die Pfadbefehle einer `constructPath`-Anweisung in Strecken übersetzen.
 *
 * pdfjs packt Befehle und Koordinaten je nach Version unterschiedlich: neuere
 * Fassungen liefern einen gemeinsamen Zahlenstrom, ältere zwei getrennte
 * Listen. Beide Formen werden gelesen; passt keine, liefert die Funktion
 * nichts und der Parser weicht auf die Auswertung des Textbildes aus.
 */
function pathSegments(args: unknown, ops: PdfOperators, matrix: Matrix): Segment[] {
  if (!Array.isArray(args)) return [];

  const interleaved = typeof args[0] === 'number';
  const buffer = interleaved
    ? toNumbers(Array.isArray(args[1]) ? args[1][0] ?? args[1] : args[1])
    : null;
  const opList = interleaved ? null : toNumbers(args[0]);
  const coords = interleaved ? null : toNumbers(args[1]);

  const segments: Segment[] = [];
  let current: [number, number] | null = null;
  let start: [number, number] | null = null;

  const move = (x: number, y: number) => {
    current = apply(matrix, x, y);
    start = current;
  };
  const line = (x: number, y: number) => {
    const next = apply(matrix, x, y);
    if (current) segments.push({ x0: current[0], y0: current[1], x1: next[0], y1: next[1] });
    current = next;
  };
  const close = () => {
    if (current && start) segments.push({ x0: current[0], y0: current[1], x1: start[0], y1: start[1] });
    current = start;
  };
  const rect = (x: number, y: number, w: number, h: number) => {
    move(x, y);
    line(x + w, y);
    line(x + w, y + h);
    line(x, y + h);
    close();
  };

  if (buffer) {
    // Gemeinsamer Strom: [Befehl, Koordinaten…, Befehl, …]
    let i = 0;
    while (i < buffer.length) {
      const op = buffer[i++];
      if (op === 0) { move(buffer[i++], buffer[i++]); }
      else if (op === 1) { line(buffer[i++], buffer[i++]); }
      else if (op === 2) { i += 4; line(buffer[i++], buffer[i++]); }
      else if (op === 3) { i += 2; line(buffer[i++], buffer[i++]); }
      else if (op === 4) { close(); }
      else return segments;
    }
    return segments;
  }

  if (opList && coords) {
    let i = 0;
    for (const op of opList) {
      if (op === ops.moveTo) move(coords[i++], coords[i++]);
      else if (op === ops.lineTo) line(coords[i++], coords[i++]);
      else if (op === ops.curveTo) { i += 4; line(coords[i++], coords[i++]); }
      else if (op === ops.closePath) close();
      else if (op === ops.rectangle) rect(coords[i++], coords[i++], coords[i++], coords[i++]);
      else return segments;
    }
  }

  return segments;
}

/** Alle gezeichneten Strecken einer Seite. */
export function extractSegments(list: PdfOperatorList, ops: PdfOperators): Segment[] {
  if (ops.constructPath === undefined) return [];

  const segments: Segment[] = [];
  const stack: Matrix[] = [];
  let matrix: Matrix = IDENTITY;

  for (let i = 0; i < list.fnArray.length; i++) {
    const fn = list.fnArray[i];
    if (fn === ops.save) {
      stack.push(matrix);
    } else if (fn === ops.restore) {
      matrix = stack.pop() ?? IDENTITY;
    } else if (fn === ops.transform) {
      const args = toNumbers(list.argsArray[i]);
      if (args && args.length >= 6) matrix = multiply(matrix, args.slice(0, 6) as Matrix);
    } else if (fn === ops.constructPath) {
      segments.push(...pathSegments(list.argsArray[i], ops, matrix));
    }
  }

  return segments;
}

// ── Raster ──────────────────────────────────────────────────────────

interface Span {
  from: number;
  to: number;
}

/** Eine senkrechte Kante der Tabelle: eine x-Position und wo sie gezogen ist. */
interface ColumnEdge {
  x: number;
  spans: Span[];
  length: number;
}

/** Eine waagerechte Kante: eine y-Position und wie weit sie reicht. */
interface RowEdge {
  y: number;
  spans: Span[];
}

function mergeSpans(spans: Span[]): Span[] {
  const sorted = [...spans].sort((a, b) => a.from - b.from);
  const merged: Span[] = [];
  for (const span of sorted) {
    const last = merged[merged.length - 1];
    if (last && span.from <= last.to + 0.5) last.to = Math.max(last.to, span.to);
    else merged.push({ ...span });
  }
  return merged;
}

function coveredBy(spans: Span[], value: number, tolerance = 0.5): boolean {
  return spans.some((span) => value >= span.from - tolerance && value <= span.to + tolerance);
}

function clusterByPosition<T extends { position: number }>(entries: T[], tolerance: number): T[][] {
  const sorted = [...entries].sort((a, b) => a.position - b.position);
  const groups: T[][] = [];
  for (const entry of sorted) {
    const group = groups[groups.length - 1];
    if (group && entry.position - group[group.length - 1].position <= tolerance) group.push(entry);
    else groups.push([entry]);
  }
  return groups;
}

/** Eine Zelle der Tabelle. Sie kann mehrere Spalten und Zeilen umfassen. */
export interface GridCell {
  /** Index der ersten und letzten Spalte, die die Zelle bedeckt. */
  fromColumn: number;
  toColumn: number;
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export class TableGrid {
  /** Die senkrechten Kanten von links nach rechts. */
  readonly columns: number[];

  private readonly columnEdges: ColumnEdge[];
  private readonly rowEdges: RowEdge[];

  private constructor(columnEdges: ColumnEdge[], rowEdges: RowEdge[]) {
    this.columnEdges = columnEdges;
    this.rowEdges = rowEdges;
    this.columns = columnEdges.map((edge) => edge.x);
  }

  /**
   * Baut das Raster aus den gezeichneten Strecken.
   * Gibt `null` zurück, wenn zu wenig Linien für eine Tabelle da sind.
   */
  static fromSegments(segments: Segment[]): TableGrid | null {
    const vertical = segments.filter(
      (s) => Math.abs(s.x0 - s.x1) < 0.8 && Math.abs(s.y0 - s.y1) > 2,
    );
    const horizontal = segments.filter(
      (s) => Math.abs(s.y0 - s.y1) < 0.8 && Math.abs(s.x0 - s.x1) > 2,
    );
    if (vertical.length < 6 || horizontal.length < 10) return null;

    const columnGroups = clusterByPosition(
      vertical.map((s) => ({ position: (s.x0 + s.x1) / 2, segment: s })),
      2.5,
    );

    const columnEdges: ColumnEdge[] = columnGroups.map((group) => {
      const spans = mergeSpans(group.map(({ segment }) => ({
        from: Math.min(segment.y0, segment.y1),
        to: Math.max(segment.y0, segment.y1),
      })));
      return {
        x: group.reduce((sum, entry) => sum + entry.position, 0) / group.length,
        spans,
        length: spans.reduce((sum, span) => sum + (span.to - span.from), 0),
      };
    });

    // Kurze Striche sind Beiwerk (Unterstreichungen, Rahmen von Beschriftungen)
    // und keine Spaltenkanten.
    const longest = Math.max(...columnEdges.map((edge) => edge.length));
    const keep = columnEdges.filter((edge) => edge.length >= Math.max(30, longest * 0.08));
    if (keep.length < 4) return null;

    const rowGroups = clusterByPosition(
      horizontal.map((s) => ({ position: (s.y0 + s.y1) / 2, segment: s })),
      1.2,
    );
    const rowEdges: RowEdge[] = rowGroups.map((group) => ({
      y: group.reduce((sum, entry) => sum + entry.position, 0) / group.length,
      spans: mergeSpans(group.map(({ segment }) => ({
        from: Math.min(segment.x0, segment.x1),
        to: Math.max(segment.x0, segment.x1),
      }))),
    })).sort((a, b) => b.y - a.y);

    return new TableGrid(keep, rowEdges);
  }

  /** Ist die Trennlinie `index` auf Höhe `y` gezogen? */
  hasColumnEdgeAt(index: number, y: number): boolean {
    const edge = this.columnEdges[index];
    return !!edge && coveredBy(edge.spans, y);
  }

  /** Die waagerechten Kanten, die `x` überdecken — von oben nach unten. */
  rowEdgesAt(x: number): number[] {
    return this.rowEdges.filter((edge) => coveredBy(edge.spans, x, 1)).map((edge) => edge.y);
  }

  /**
   * Die Zellen einer Spalte, von oben nach unten.
   *
   * Zellen, die nach links über die Spalte hinausreichen, werden ausgelassen —
   * sie gehören zur Spalte, in der sie beginnen, und werden dort geliefert.
   */
  cellsInColumn(index: number): GridCell[] {
    const left = this.columns[index];
    const right = this.columns[index + 1];
    if (left === undefined || right === undefined) return [];

    const middle = (left + right) / 2;
    const edges = this.rowEdgesAt(middle);
    const cells: GridCell[] = [];

    for (let i = 0; i < edges.length - 1; i++) {
      const top = edges[i];
      const bottom = edges[i + 1];
      const centreY = (top + bottom) / 2;

      // Nach links verbunden? Dann gehört die Zelle zur Spalte davor.
      if (index > 0 && !this.hasColumnEdgeAt(index, centreY)) continue;

      let toColumn = index;
      while (
        toColumn + 2 < this.columns.length
        && !this.hasColumnEdgeAt(toColumn + 1, centreY)
      ) {
        toColumn += 1;
      }

      cells.push({
        fromColumn: index,
        toColumn,
        left,
        right: this.columns[toColumn + 1],
        top,
        bottom,
      });
    }

    return cells;
  }
}
