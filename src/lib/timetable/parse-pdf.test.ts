import { describe, expect, it } from 'vitest';

import { parseTimetablePdf, parseTimetableFilename } from './parse-pdf';
import type { ParsedSchedule } from './types';

describe('parseTimetableFilename', () => {
  it('liest Kalenderwoche, Halbjahr und Schuljahr aus dem Standardnamen', () => {
    expect(parseTimetableFilename('Stundenplan_kw_37_Hj1_2025_26.pdf')).toEqual({
      kw: 37,
      halfYear: 1,
      yearStart: 2025,
      yearEndShort: 26,
    });
  });

  it('akzeptiert Leerzeichen statt Unterstrichen und beliebige Groß-/Kleinschreibung', () => {
    expect(parseTimetableFilename('Stundenplan KW 5 hj2 2026 27.pdf')).toEqual({
      kw: 5,
      halfYear: 2,
      yearStart: 2026,
      yearEndShort: 27,
    });
  });

  it('gibt null zurück, wenn der Name dem Muster nicht folgt', () => {
    expect(parseTimetableFilename('irgendwas.pdf')).toBeNull();
    expect(parseTimetableFilename('Stundenplan_final.pdf')).toBeNull();
  });
});

// ── Nachbau eines echten Stundenplan-PDFs ───────────────────────────
//
// Maße und Aufbau stammen aus den Plänen der Schule: links Tag, Stundennummer
// und Zeit, rechts je Klasse eine Fachspalte und eine schmale Raumspalte.
// Eine Doppelstunde belegt zwei Zeilen — Fach oben, Lehrerkürzel darunter.

interface RawItem {
  str: string;
  transform: number[];
  width: number;
  height: number;
}

const CHAR_WIDTH = 4.2;
const LINE_HEIGHT = 8;

function item(str: string, x: number, y: number, width = str.length * CHAR_WIDTH): RawItem {
  return { str, transform: [1, 0, 0, LINE_HEIGHT, x, y], width, height: LINE_HEIGHT };
}

function fakePdf(pages: RawItem[][]) {
  return () => ({
    promise: Promise.resolve({
      numPages: pages.length,
      getPage: async (n: number) => ({
        getTextContent: async () => ({ items: pages[n - 1] ?? [] }),
      }),
    }),
  });
}

const GROUP_WIDTH = 100;
const FIRST_GROUP_X = 150;
const ROOM_OFFSET = 78;

const PERIOD_TIMES: Record<number, string> = {
  1: '8.00 - 8.45',
  2: '8.45 - 9.30',
  3: '9.50 - 10.35',
  4: '10.35 - 11.20',
  5: '11.40 - 12.25',
  6: '12.25 - 13.10',
  7: '14.10 - 14.55',
  8: '14.55 - 15.40',
};

const DAYS = ['MO', 'DI', 'MI', 'DO', 'FR'] as const;

/** Was in einer Zelle steht: Fachzeile, Lehrerzeile, Raum. */
interface CellSpec {
  period: number;
  text?: string;
  /** Zweite Zeile der Zelle (meist das Lehrerkürzel). */
  second?: string;
  room?: string;
  /** Raum auf die Fachzeile setzen statt auf die Lehrerzeile. */
  roomOnFirstLine?: boolean;
}

interface PlanSpec {
  classes: string[];
  /** Spalte „R" im Kopf mitzeichnen. */
  roomHeader?: boolean;
  periodsPerDay?: number;
  days?: readonly string[];
  cells: Record<string, Record<string, CellSpec[]>>;
  /** Über mehrere Zeilen laufende Zellen ohne Fach-/Raumangaben. */
  blocks?: Record<string, Record<string, string[]>>;
}

function buildPlan(spec: PlanSpec): RawItem[] {
  const items: RawItem[] = [];
  const days = spec.days ?? DAYS;
  const periods = spec.periodsPerDay ?? 8;
  const groupX = (index: number) => FIRST_GROUP_X + index * GROUP_WIDTH;

  // Kopfzeile: Klassenkürzel mittig über der Gruppe, daneben die Raumspalte.
  let y = 800;
  spec.classes.forEach((cls, index) => {
    const labelWidth = cls.length * CHAR_WIDTH;
    items.push(item(cls, groupX(index) + (ROOM_OFFSET - labelWidth) / 2, y, labelWidth));
    if (spec.roomHeader !== false) {
      items.push(item('R', groupX(index) + ROOM_OFFSET, y, 6));
    }
  });

  y -= 20;

  for (const day of days) {
    for (let period = 1; period <= periods; period++) {
      const time = PERIOD_TIMES[period] ?? '16.00 - 16.45';

      // Das Wochentagskürzel steht mitten im Tagesblock, nicht in dessen erster
      // Zeile — genau wie im Original.
      if (period === 6) items.push(item(day, 20, y, 14));
      items.push(item(`${period}.`, 48, y, 10));
      items.push(item(time, 66, y, 52));

      spec.classes.forEach((cls, index) => {
        const x = groupX(index);
        const block = spec.blocks?.[cls]?.[day];
        if (block) {
          const line = block[period - 1];
          if (line) items.push(item(line, x + 4, y, Math.min(line.length * CHAR_WIDTH, 70)));
          return;
        }

        const cells = spec.cells[cls]?.[day] ?? [];
        const own = cells.find((cell) => cell.period === period);
        if (own) {
          if (own.text) items.push(item(own.text, x, y, Math.min(own.text.length * CHAR_WIDTH, 70)));
          if (own.room && own.roomOnFirstLine) {
            items.push(item(own.room, x + ROOM_OFFSET, y, own.room.length * CHAR_WIDTH));
          }
          return;
        }

        // Zweite Zeile einer Doppelstunde, die in der Stunde davor beginnt.
        const parent = cells.find((cell) => cell.period === period - 1);
        if (parent && (parent.second || (parent.room && !parent.roomOnFirstLine))) {
          if (parent.second) {
            items.push(item(parent.second, x, y, parent.second.length * CHAR_WIDTH));
          }
          if (parent.room && !parent.roomOnFirstLine) {
            items.push(item(parent.room, x + ROOM_OFFSET, y, parent.room.length * CHAR_WIDTH));
          }
        }
      });

      y -= LINE_HEIGHT + 4;
      if (period === 6) y -= 6; // Mittagspause
    }
    y -= 10;
  }

  return items;
}

const BASE_PLAN: PlanSpec = {
  classes: ['HT11', 'HT12', 'G21'],
  cells: {
    HT11: {
      MO: [
        { period: 1, text: 'Deutsch', second: 'MEL', room: '6' },
        { period: 3, text: 'Modul1/KuSti', second: 'MEL', room: '6' },
        { period: 5, text: 'Modul7/Excel', second: 'WED', room: '3' },
      ],
      DI: [
        { period: 3, text: 'Modul2/Obfl', second: 'WED', room: '6' },
        { period: 7, text: 'Serviceteam' },
      ],
      MI: [{ period: 1, text: 'Politik', second: 'STI', room: '8' }],
      DO: [{ period: 1, text: 'Mathematik', second: 'TAM', room: '5' }],
      FR: [{ period: 1, text: 'Modul2/CNC', second: 'HOFF', room: '4' }],
    },
    HT12: {
      MO: [{ period: 3, text: 'Modul7/Excel', second: 'WED', room: '3' }],
      DI: [{ period: 1, text: 'Politik', second: 'STI', room: '8' }],
      MI: [{ period: 1, text: 'Modul7/ReWe', second: 'STI', room: '8' }],
      DO: [{ period: 1, text: 'Englisch', second: 'WEN', room: '9' }],
      FR: [{ period: 3, text: 'Modul2/CAD', second: 'HOFF', room: '4' }],
    },
    G21: {
      MO: [{ period: 1, text: 'Entwurf/Konstruktion', second: 'WEZ/BER', room: '7' }],
      DI: [{ period: 3, text: 'Mathe', second: 'TAM', room: '5' }],
      MI: [{ period: 7, text: 'Farbe und Form', second: 'BÜ', room: 'BS' }],
      DO: [{ period: 1, text: 'Möbelkonstruktion', second: 'STE/WEN', room: '1' }],
      FR: [{ period: 1, text: 'Designgeschichte', second: 'STE', room: 'BS' }],
    },
  },
};

async function parsePlan(spec: PlanSpec) {
  return parseTimetablePdf(new ArrayBuffer(0), fakePdf([buildPlan(spec)]));
}

function lesson(schedule: ParsedSchedule, cls: string, day: string, period: number) {
  return schedule[cls][day as 'MO'].find((entry) => entry.period === period);
}

describe('parseTimetablePdf — Grundlagen', () => {
  it('erkennt Klassen, Tage, Stunden, Lehrkraft und Raum', async () => {
    const { schedule } = await parsePlan(BASE_PLAN);

    expect(Object.keys(schedule).sort()).toEqual(['G21', 'HT11', 'HT12']);

    expect(lesson(schedule, 'HT11', 'MO', 1)).toEqual({
      period: 1,
      periodEnd: 2,
      time: '8.00 - 9.30',
      subject: 'Deutsch',
      detail: 'MEL',
      room: '6',
    });

    expect(lesson(schedule, 'G21', 'MO', 1)?.detail).toBe('WEZ/BER');
    expect(lesson(schedule, 'G21', 'MI', 7)?.room).toBe('BS');
  });

  it('ordnet jede Stunde genau einer Klassenspalte zu', async () => {
    const { schedule } = await parsePlan(BASE_PLAN);

    const ht11 = Object.values(schedule.HT11).flat().map((entry) => entry.subject).join(' ');
    expect(ht11).not.toContain('Englisch');
    expect(ht11).not.toContain('Möbelkonstruktion');
  });

  it('trägt jeden Wochentag getrennt ein', async () => {
    const { schedule } = await parsePlan(BASE_PLAN);

    expect(lesson(schedule, 'HT11', 'MO', 1)?.subject).toBe('Deutsch');
    expect(lesson(schedule, 'HT11', 'MI', 1)?.subject).toBe('Politik');
    expect(lesson(schedule, 'HT11', 'DO', 1)?.subject).toBe('Mathematik');
    expect(lesson(schedule, 'HT11', 'FR', 1)?.subject).toBe('Modul2/CNC');
  });

  it('meldet einen Fehler, wenn keine Klassen im Kopf stehen', async () => {
    const withoutClasses = [
      item('1.', 48, 760),
      item('8.00 - 8.45', 66, 760),
    ];

    await expect(parseTimetablePdf(new ArrayBuffer(0), fakePdf([withoutClasses])))
      .rejects.toThrow(/Klassen/);
  });
});

describe('parseTimetablePdf — Räume', () => {
  it('liest den Raum aus seiner Spalte, egal auf welcher Zeile er steht', async () => {
    // Im Original sitzt die Raumnummer mittig in der verbundenen Zelle und
    // landet mal auf der Fach-, mal auf der Lehrerzeile.
    const plan: PlanSpec = {
      ...BASE_PLAN,
      cells: {
        ...BASE_PLAN.cells,
        HT11: {
          ...BASE_PLAN.cells.HT11,
          MO: [
            { period: 1, text: 'Deutsch', second: 'MEL', room: '6', roomOnFirstLine: true },
            { period: 3, text: 'Modul1/KuSti', second: 'MEL', room: '6' },
          ],
        },
      },
    };

    const { schedule } = await parsePlan(plan);

    expect(lesson(schedule, 'HT11', 'MO', 1)?.room).toBe('6');
    expect(lesson(schedule, 'HT11', 'MO', 1)?.subject).toBe('Deutsch');
    expect(lesson(schedule, 'HT11', 'MO', 3)?.room).toBe('6');
  });

  it('erkennt die Raumspalte auch ohne „R" in der Kopfzeile', async () => {
    const { schedule } = await parsePlan({ ...BASE_PLAN, roomHeader: false });

    expect(lesson(schedule, 'HT11', 'MO', 1)?.subject).toBe('Deutsch');
    expect(lesson(schedule, 'HT11', 'MO', 1)?.room).toBe('6');
  });

  it('erkennt Raumkürzel mit Buchstaben', async () => {
    const plan: PlanSpec = {
      ...BASE_PLAN,
      cells: {
        ...BASE_PLAN.cells,
        HT11: {
          ...BASE_PLAN.cells.HT11,
          MO: [
            { period: 1, text: 'Fertigungstechnik', second: 'GRO', room: 'W1' },
            { period: 3, text: 'Modul7/ReWe', second: 'STI', room: 'T1' },
            { period: 5, text: 'Modul6/Mark', second: 'STI', room: '3/8' },
          ],
        },
      },
    };

    const { schedule } = await parsePlan(plan);

    expect(lesson(schedule, 'HT11', 'MO', 1)?.room).toBe('W1');
    expect(lesson(schedule, 'HT11', 'MO', 1)?.subject).toBe('Fertigungstechnik');
    expect(lesson(schedule, 'HT11', 'MO', 3)?.room).toBe('T1');
    expect(lesson(schedule, 'HT11', 'MO', 5)?.room).toBe('3/8');
  });

  it('lässt Excel-Fehlerwerte weg statt sie als Raum zu übernehmen', async () => {
    const plan: PlanSpec = {
      ...BASE_PLAN,
      cells: {
        ...BASE_PLAN.cells,
        HT11: {
          ...BASE_PLAN.cells.HT11,
          MO: [{ period: 1, text: 'Deutsch', second: 'MEL', room: '#NV' }],
        },
      },
    };

    const { schedule } = await parsePlan(plan);
    const entry = lesson(schedule, 'HT11', 'MO', 1);

    expect(entry?.subject).toBe('Deutsch');
    expect(entry?.room).toBeUndefined();
  });
});

describe('parseTimetablePdf — mehrzeilige Zellen', () => {
  it('setzt eine über zwei Zeilen umgebrochene Zelle wieder zusammen', async () => {
    const plan: PlanSpec = {
      ...BASE_PLAN,
      cells: {
        ...BASE_PLAN.cells,
        HT11: {
          ...BASE_PLAN.cells.HT11,
          MO: [{ period: 3, text: 'Freihandzeichnen-Aufgabe', second: 'ohne Lehrer', room: '9' }],
        },
      },
    };

    const { schedule } = await parsePlan(plan);
    const entry = lesson(schedule, 'HT11', 'MO', 3);

    expect(entry?.subject).toBe('Freihandzeichnen-Aufgabe ohne Lehrer');
    expect(entry?.periodEnd).toBe(4);
    expect(entry?.room).toBe('9');
    expect(schedule.HT11.MO.some((e) => e.subject === 'ohne Lehrer')).toBe(false);
  });

  it('behält eine einzelne Stunde ohne Lehrkraft als eigenen Eintrag', async () => {
    const { schedule } = await parsePlan(BASE_PLAN);
    const entry = lesson(schedule, 'HT11', 'DI', 7);

    expect(entry?.subject).toBe('Serviceteam');
    expect(entry?.periodEnd).toBeUndefined();
  });

  it('macht aus einem alleinstehenden Kürzel kein Lehrerfeld, sondern ein Fach', async () => {
    const plan: PlanSpec = {
      ...BASE_PLAN,
      cells: {
        ...BASE_PLAN.cells,
        HT11: { ...BASE_PLAN.cells.HT11, DI: [{ period: 7, text: 'USF' }] },
      },
    };

    const { schedule } = await parsePlan(plan);
    expect(lesson(schedule, 'HT11', 'DI', 7)?.subject).toBe('USF');
  });
});

describe('parseTimetablePdf — Blockveranstaltungen', () => {
  it('fasst einen durchgehenden Tag zu einem Eintrag zusammen', async () => {
    const plan: PlanSpec = {
      ...BASE_PLAN,
      blocks: {
        HT11: {
          MO: [undefined, 'UNTERNEHMENS-', 'PROJEKT', undefined, 'SERIEN-', 'FERTIGUNG'] as never,
        },
      },
    };

    const { schedule } = await parsePlan(plan);

    expect(schedule.HT11.MO).toHaveLength(1);
    expect(schedule.HT11.MO[0].subject).toBe('UNTERNEHMENSPROJEKT SERIENFERTIGUNG');
    expect(schedule.HT11.MO[0].period).toBe(1);
    expect(schedule.HT11.MO[0].periodEnd).toBe(8);
    expect(schedule.HT11.MO[0].time).toBe('8.00 - 15.40');
  });

  it('faltet einen Plan ohne Lehrerangaben nicht zusammen', async () => {
    // Der alte Parser ersetzte in diesem Fall die ganze Woche durch einen
    // einzigen zusammengeklebten Titel je Tag.
    const plan: PlanSpec = {
      classes: ['HT11', 'HT12'],
      cells: {
        HT11: {
          MO: [
            { period: 1, text: 'Deutsch' },
            { period: 3, text: 'Mathematik' },
            { period: 5, text: 'Politik' },
          ],
          DI: [{ period: 1, text: 'Englisch' }],
        },
        HT12: {
          MO: [{ period: 1, text: 'Sport' }],
          DI: [{ period: 3, text: 'Kunst' }],
        },
      },
    };

    const { schedule } = await parsePlan(plan);

    expect(schedule.HT11.MO.map((entry) => entry.subject)).toEqual([
      'Deutsch',
      'Mathematik',
      'Politik',
    ]);
    expect(schedule.HT12.DI[0].subject).toBe('Kunst');
  });
});

describe('parseTimetablePdf — Robustheit', () => {
  it('erkennt einen Tag, der erst zur 3. Stunde beginnt', async () => {
    // Früher brauchte die Tageserkennung wörtlich eine Zeile mit „1." und
    // „8.00" — ein solcher Tag fiel komplett aus dem Plan.
    const items = buildPlan(BASE_PLAN).filter((entry) => {
      const y = entry.transform[5];
      const isMondayStart = y > 760 && y < 782;
      return !isMondayStart;
    });

    const { schedule } = await parseTimetablePdf(new ArrayBuffer(0), fakePdf([items]));

    expect(lesson(schedule, 'HT11', 'MO', 3)?.subject).toBe('Modul1/KuSti');
    expect(lesson(schedule, 'HT11', 'DI', 3)?.subject).toBe('Modul2/Obfl');
    expect(lesson(schedule, 'HT11', 'FR', 1)?.subject).toBe('Modul2/CNC');
  });

  it('wertet alle Seiten aus, nicht nur die erste', async () => {
    const first = buildPlan({
      ...BASE_PLAN,
      classes: ['HT11'],
      cells: { HT11: BASE_PLAN.cells.HT11 },
    });
    const second = buildPlan({
      ...BASE_PLAN,
      classes: ['G21'],
      cells: { G21: BASE_PLAN.cells.G21 },
    });

    const { schedule, pages } = await parseTimetablePdf(
      new ArrayBuffer(0),
      fakePdf([first, second]),
    );

    expect(pages).toBe(2);
    expect(Object.keys(schedule).sort()).toEqual(['G21', 'HT11']);
    expect(lesson(schedule, 'G21', 'MO', 1)?.subject).toBe('Entwurf/Konstruktion');
  });

  it('meldet Klassen ohne erkannte Stunden als Warnung', async () => {
    const plan: PlanSpec = {
      ...BASE_PLAN,
      cells: { ...BASE_PLAN.cells, G21: {} },
    };

    const { warnings } = await parsePlan(plan);
    expect(warnings.join(' ')).toMatch(/G21/);
  });

  it('normalisiert unsaubere Zeitangaben', async () => {
    const items = buildPlan(BASE_PLAN).map((entry) =>
      entry.str === '12.25 - 13.10' ? { ...entry, str: '12.25- 13.10' } : entry,
    );

    const { schedule } = await parseTimetablePdf(new ArrayBuffer(0), fakePdf([items]));
    const times = Object.values(schedule)
      .flatMap((week) => Object.values(week).flat())
      .map((entry) => entry.time);

    expect(times.every((time) => !/\d-\s/.test(time))).toBe(true);
  });
});
