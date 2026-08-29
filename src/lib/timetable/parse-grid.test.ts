import { describe, expect, it } from 'vitest';

import { parseTimetablePdf } from './parse-pdf';

/**
 * Der Weg über das gezeichnete Tabellenraster.
 *
 * Nachgebaut wird der echte Aufbau der Schulpläne: links Tag, Stunde und Zeit,
 * dann je Klasse eine Fach- und eine Raumspalte. Entscheidend sind die
 * **verbundenen Zellen** — an ihnen hängt, welche Stunden zusammengehören, wo
 * ein Tag endet und für welche Klassen ein Sondertermin gilt.
 */

const DAYS = ['MO', 'DI', 'MI', 'DO', 'FR'] as const;
const PERIODS = 8;
/** Nach der 6. Stunde liegt eine Zeile für die Mittagspause. */
const ROWS_PER_DAY = PERIODS + 1;
const PAUSE_ROW = 6;

const PERIOD_TIMES: Record<number, [string, string]> = {
  1: ['8.00 -', '8.45'],
  2: ['8.45 -', '9.30'],
  3: ['9.50 -', '10.35'],
  4: ['10.35 -', '11.20'],
  5: ['11.40 -', '12.25'],
  6: ['12.25-', '13.10'],
  7: ['14.10 -', '14.55'],
  8: ['14.55 -', '15.40'],
};

const COLUMN_WIDTHS = { day: 15, period: 14, timeFrom: 22, timeTo: 25, subject: 84, room: 18 };
const ROW_HEIGHT = 9.1;
const TABLE_TOP = 497;
const TABLE_LEFT = 20;
const CHAR_WIDTH = 4.2;

interface PlanSpec {
  classes: string[];
  /** Fachzelle: Text oben, Lehrkraft in der Zeile darunter. */
  lessons: Array<{
    cls: string;
    day: string;
    from: number;
    subject: string;
    teacher?: string;
    room?: string;
    /** Reicht die Raumzelle über beide Stunden? */
    roomMerged?: boolean;
  }>;
  /** Über Klassen und/oder Stunden verbundene Felder ohne Raum. */
  specials?: Array<{ classes: string[]; day: string; from: number; to: number; lines: string[] }>;
  /** Ein Feld über einen ganzen Tag (oder mehrere). */
  blocks?: Array<{ cls: string; days: string[]; lines: string[] }>;
}

interface Built {
  items: Array<{ str: string; transform: number[]; width: number; height: number }>;
  fnArray: number[];
  argsArray: unknown[];
}

const OPS = { constructPath: 91, save: 10, restore: 11, transform: 12 };

function buildPlan(spec: PlanSpec): Built {
  const columns: number[] = [];
  let x = TABLE_LEFT;
  const push = (width: number) => { columns.push(x); x += width; };
  push(COLUMN_WIDTHS.day);
  push(COLUMN_WIDTHS.period);
  push(COLUMN_WIDTHS.timeFrom);
  push(COLUMN_WIDTHS.timeTo);
  for (let i = 0; i < spec.classes.length; i++) {
    push(COLUMN_WIDTHS.subject);
    push(COLUMN_WIDTHS.room);
  }
  columns.push(x);

  const columnCount = columns.length - 1;
  const rowCount = DAYS.length * ROWS_PER_DAY;
  const rowY = (row: number) => TABLE_TOP - row * ROW_HEIGHT;

  const subjectColumn = (cls: string) => 4 + spec.classes.indexOf(cls) * 2;
  const roomColumn = (cls: string) => subjectColumn(cls) + 1;
  const dayIndex = (day: string) => DAYS.indexOf(day as (typeof DAYS)[number]);
  /** Zeilenindex einer Stunde: die Pausenzeile liegt zwischen der 6. und 7. */
  const rowOf = (day: string, period: number) =>
    dayIndex(day) * ROWS_PER_DAY + (period <= PAUSE_ROW ? period - 1 : period);

  // ── Felder einsammeln ──
  const regions: Array<{ c0: number; c1: number; r0: number; r1: number; lines: string[] }> = [];

  for (const day of DAYS) {
    regions.push({
      c0: 0,
      c1: 0,
      r0: dayIndex(day) * ROWS_PER_DAY,
      r1: dayIndex(day) * ROWS_PER_DAY + ROWS_PER_DAY - 1,
      lines: [day],
    });
  }

  for (const lesson of spec.lessons) {
    const top = rowOf(lesson.day, lesson.from);
    const bottom = rowOf(lesson.day, lesson.from + 1);
    const subject = subjectColumn(lesson.cls);
    const room = roomColumn(lesson.cls);

    regions.push({ c0: subject, c1: subject, r0: top, r1: top, lines: [lesson.subject] });
    if (lesson.teacher) {
      regions.push({ c0: subject, c1: subject, r0: bottom, r1: bottom, lines: [lesson.teacher] });
    }
    if (lesson.room) {
      if (lesson.roomMerged === false) {
        regions.push({ c0: room, c1: room, r0: top, r1: top, lines: [lesson.room] });
      } else {
        regions.push({ c0: room, c1: room, r0: top, r1: bottom, lines: [lesson.room] });
      }
    }
  }

  for (const special of spec.specials ?? []) {
    regions.push({
      c0: subjectColumn(special.classes[0]),
      c1: roomColumn(special.classes[special.classes.length - 1]),
      r0: rowOf(special.day, special.from),
      r1: rowOf(special.day, special.to),
      lines: special.lines,
    });
  }

  for (const block of spec.blocks ?? []) {
    const days = block.days.map(dayIndex).sort((a, b) => a - b);
    regions.push({
      c0: subjectColumn(block.cls),
      c1: roomColumn(block.cls),
      r0: days[0] * ROWS_PER_DAY,
      r1: days[days.length - 1] * ROWS_PER_DAY + ROWS_PER_DAY - 1,
      lines: block.lines,
    });
  }

  // Stunden- und Zeitspalten
  for (const day of DAYS) {
    for (let period = 1; period <= PERIODS; period++) {
      const row = rowOf(day, period);
      const [from, to] = PERIOD_TIMES[period];
      regions.push({ c0: 1, c1: 1, r0: row, r1: row, lines: [`${period}.`] });
      regions.push({ c0: 2, c1: 2, r0: row, r1: row, lines: [from] });
      regions.push({ c0: 3, c1: 3, r0: row, r1: row, lines: [to] });
    }
  }

  // ── Text setzen ──
  const items: Built['items'] = [];
  const write = (str: string, centreX: number, y: number) => {
    const width = str.length * CHAR_WIDTH;
    items.push({ str, transform: [1, 0, 0, 8, centreX - width / 2, y], width, height: 8 });
  };

  // Kopfzeile über der Tabelle
  for (const cls of spec.classes) {
    const column = subjectColumn(cls);
    write(cls, (columns[column] + columns[column + 1]) / 2, TABLE_TOP + 11);
    write('R', (columns[column + 1] + columns[column + 2]) / 2, TABLE_TOP + 11);
  }

  for (const region of regions) {
    if (region.lines.length === 0) continue;
    const centreX = (columns[region.c0] + columns[region.c1 + 1]) / 2;
    const rows = region.r1 - region.r0 + 1;
    region.lines.forEach((line, index) => {
      // Die Zeilen sitzen mittig im Feld, so wie Excel sie setzt.
      const offset = (rows - region.lines.length) / 2 + index;
      write(line, centreX, rowY(region.r0 + offset) - ROW_HEIGHT + 2.5);
    });
  }

  // ── Linien zeichnen ──
  const fnArray: number[] = [];
  const argsArray: unknown[] = [];
  const line = (x0: number, y0: number, x1: number, y1: number) => {
    fnArray.push(OPS.constructPath);
    argsArray.push([28, [[0, x0, y0, 1, x1, y1]], null]);
  };

  const insideVertical = (columnEdge: number, row: number) =>
    regions.some((r) => r.c0 < columnEdge && columnEdge <= r.c1 && row >= r.r0 && row <= r.r1);
  const insideHorizontal = (rowEdge: number, column: number) =>
    regions.some((r) => r.r0 < rowEdge && rowEdge <= r.r1 && column >= r.c0 && column <= r.c1);

  for (let edge = 0; edge <= columnCount; edge++) {
    for (let row = 0; row < rowCount; row++) {
      if (edge > 0 && edge < columnCount && insideVertical(edge, row)) continue;
      line(columns[edge], rowY(row), columns[edge], rowY(row + 1));
    }
  }
  for (let edge = 0; edge <= rowCount; edge++) {
    for (let column = 0; column < columnCount; column++) {
      if (edge > 0 && edge < rowCount && insideHorizontal(edge, column)) continue;
      line(columns[column], rowY(edge), columns[column + 1], rowY(edge));
    }
  }

  return { items, fnArray, argsArray };
}

function fakePdf(built: Built) {
  return () => ({
    promise: Promise.resolve({
      numPages: 1,
      getPage: async () => ({
        getTextContent: async () => ({ items: built.items }),
        getOperatorList: async () => ({ fnArray: built.fnArray, argsArray: built.argsArray }),
      }),
    }),
  });
}

async function parse(spec: PlanSpec) {
  return parseTimetablePdf(new ArrayBuffer(0), fakePdf(buildPlan(spec)), { ops: OPS });
}

const BASE: PlanSpec = {
  classes: ['HT11', 'HT12', 'HT21', 'G21'],
  lessons: [
    { cls: 'HT11', day: 'MO', from: 1, subject: 'Deutsch', teacher: 'MEL', room: '6' },
    { cls: 'HT11', day: 'MO', from: 3, subject: 'Modul1/KuSti', teacher: 'MEL', room: '6' },
    { cls: 'HT11', day: 'MO', from: 7, subject: 'Buchführung', teacher: 'TAM', room: '5', roomMerged: false },
    { cls: 'HT11', day: 'DI', from: 1, subject: 'CAD', teacher: 'WEN', room: 'T1' },
    { cls: 'HT12', day: 'MO', from: 3, subject: 'Modul7/Excel', teacher: 'WED', room: '3' },
    { cls: 'HT12', day: 'DI', from: 1, subject: 'Politik', teacher: 'STI', room: 'HS' },
    { cls: 'HT21', day: 'MI', from: 1, subject: 'Modul5/AV', teacher: 'HOG', room: '1' },
    { cls: 'G21', day: 'DO', from: 5, subject: 'Farbe und Form', teacher: 'BÜ', room: 'BS' },
  ],
};

describe('Rasterweg — Grundlagen', () => {
  it('liest Klassen, Tage, Stunden, Lehrkraft und Raum aus dem Raster', async () => {
    const { schedule, source } = await parse(BASE);

    expect(source).toBe('raster');
    expect(Object.keys(schedule).sort()).toEqual(['G21', 'HT11', 'HT12', 'HT21']);
    expect(schedule.HT11.MO[0]).toEqual({
      period: 1,
      periodEnd: 2,
      time: '8.00 - 9.30',
      subject: 'Deutsch',
      detail: 'MEL',
      room: '6',
    });
    expect(schedule.HT21.MI[0].subject).toBe('Modul5/AV');
    expect(schedule.G21.DO[0]).toMatchObject({ period: 5, periodEnd: 6, subject: 'Farbe und Form', room: 'BS' });
  });

  it('nimmt den Raum aus seiner Spalte, auch wenn er ein Buchstabenkürzel ist', async () => {
    const { schedule } = await parse(BASE);

    expect(schedule.HT11.DI[0]).toMatchObject({ subject: 'CAD', detail: 'WEN', room: 'T1' });
    expect(schedule.HT12.DI[0]).toMatchObject({ subject: 'Politik', detail: 'STI', room: 'HS' });
  });

  it('hält ein Fach, das wie ein Lehrerkürzel aussieht, auseinander', async () => {
    const { schedule } = await parse(BASE);

    // „CAD" steht in der Fachzeile und ist deshalb ein Fach, „WEN" darunter
    // die Lehrkraft.
    expect(schedule.HT11.DI[0].subject).toBe('CAD');
    expect(schedule.HT11.DI[0].detail).toBe('WEN');
  });

  it('legt die Doppelstunde auch zusammen, wenn die Raumzelle nicht verbunden ist', async () => {
    const { schedule } = await parse(BASE);
    const buchfuehrung = schedule.HT11.MO.find((lesson) => lesson.subject === 'Buchführung');

    expect(buchfuehrung).toMatchObject({ period: 7, periodEnd: 8, detail: 'TAM', room: '5' });
  });

  it('meldet für einen sauberen Plan keine Warnungen', async () => {
    const { warnings } = await parse(BASE);
    expect(warnings).toEqual([]);
  });
});

describe('Rasterweg — verbundene Zellen', () => {
  it('gibt einen Sondertermin allen Klassen, über die seine Zelle reicht', async () => {
    const { schedule } = await parse({
      ...BASE,
      specials: [
        { classes: ['HT11', 'HT12'], day: 'DI', from: 7, to: 8, lines: ['Serviceteam'] },
        { classes: ['HT21', 'G21'], day: 'DI', from: 7, to: 8, lines: ['USF-Treffen'] },
      ],
    });

    for (const cls of ['HT11', 'HT12']) {
      expect(schedule[cls].DI.find((l) => l.period === 7)).toMatchObject({
        subject: 'Serviceteam',
        periodEnd: 8,
        time: '14.10 - 15.40',
      });
    }
    for (const cls of ['HT21', 'G21']) {
      expect(schedule[cls].DI.find((l) => l.period === 7)?.subject).toBe('USF-Treffen');
    }
  });

  it('gibt einen Sondertermin nicht an Klassen daneben weiter', async () => {
    const { schedule } = await parse({
      ...BASE,
      specials: [{ classes: ['HT11'], day: 'MI', from: 7, to: 8, lines: ['KuSti-Exkursion'] }],
    });

    expect(schedule.HT11.MI.find((l) => l.subject === 'KuSti-Exkursion')).toBeTruthy();
    expect(schedule.HT12.MI.find((l) => l.subject === 'KuSti-Exkursion')).toBeUndefined();
  });

  it('setzt einen umgebrochenen Blocktext wieder zusammen und legt ihn über den Tag', async () => {
    const { schedule } = await parse({
      ...BASE,
      blocks: [{
        cls: 'HT21',
        days: ['MO', 'DI'],
        lines: ['UNTER-', 'NEHMENS-', 'PROJEKT', 'SERIEN-', 'FERTIGUNG'],
      }],
    });

    for (const day of ['MO', 'DI'] as const) {
      expect(schedule.HT21[day]).toHaveLength(1);
      expect(schedule.HT21[day][0]).toMatchObject({
        period: 1,
        periodEnd: 8,
        time: '8.00 - 15.40',
        subject: 'UNTERNEHMENSPROJEKT SERIENFERTIGUNG',
      });
    }
    // Der Block gehört nur dieser Klasse.
    expect(schedule.HT12.MO.some((l) => l.subject?.includes('UNTERNEHMEN'))).toBe(false);
  });

  it('trägt einen Sondertermin ohne Raum auch ohne Raumangabe ein', async () => {
    const { schedule } = await parse({
      ...BASE,
      specials: [{ classes: ['HT11', 'HT12'], day: 'DI', from: 7, to: 8, lines: ['Serviceteam'] }],
    });

    expect(schedule.HT11.DI.find((l) => l.period === 7)?.room).toBeUndefined();
  });
});

describe('Rasterweg — Rückfall', () => {
  it('weicht ohne Zeichenbefehle auf das Textbild aus', async () => {
    const built = buildPlan(BASE);
    const withoutOps = () => ({
      promise: Promise.resolve({
        numPages: 1,
        getPage: async () => ({ getTextContent: async () => ({ items: built.items }) }),
      }),
    });

    const { schedule, source, warnings } = await parseTimetablePdf(new ArrayBuffer(0), withoutOps);

    expect(source).toBe('textbild');
    expect(warnings.join(' ')).toMatch(/keine gezeichnete Tabelle/);
    expect(schedule.HT11.MO.length).toBeGreaterThan(0);
  });

  it('weicht auf das Textbild aus, wenn die Zeichenbefehle unbekannt sind', async () => {
    const built = buildPlan(BASE);
    const broken = { ...built, argsArray: built.argsArray.map(() => ['unlesbar']) };

    const { source } = await parseTimetablePdf(new ArrayBuffer(0), fakePdf(broken), { ops: OPS });

    expect(source).toBe('textbild');
  });
});
