import { describe, expect, it } from 'vitest';

import { parseTimetablePdf } from './parse-pdf';
import { ERWARTET, ZELLEN, type FixtureCell } from './real-week.fixture';
import { WEEKDAYS } from './types';

/**
 * Ein ganzer Wochenplan der Schule, aus den Zellen wieder zu einem PDF-Textbild
 * gezeichnet und zurückgelesen.
 *
 * Der Parser scheitert erfahrungsgemäß nicht an einzelnen Regeln, sondern an
 * der Größe: sieben Klassenspalten nebeneinander, dazwischen schmale
 * Raumspalten, eine Klasse ganz ohne Unterricht, Blöcke über den ganzen Tag.
 * Genau das steht hier.
 */

const PERIOD_TIMES: Record<number, string> = {
  1: '8.00 - 8.45',
  2: '8.45 - 9.30',
  3: '9.50 - 10.35',
  4: '10.35 - 11.20',
  5: '11.40 - 12.25',
  6: '12.25 - 13.10',
  7: '14.10 - 14.55',
  8: '14.55 - 15.40',
  9: '15.45 - 16.30',
  10: '16.30 - 17.15',
};

const CHAR_WIDTH = 4.2;
const GROUP_WIDTH = 100;
const FIRST_GROUP_X = 150;
const ROOM_OFFSET = 78;

function item(str: string, x: number, y: number, width = str.length * CHAR_WIDTH) {
  return { str, transform: [1, 0, 0, 8, x, y], width, height: 8 };
}

/** Zeichnet die Zellen so, wie der Excel-Export sie ins PDF setzt. */
function renderWeek(cells: Record<string, Record<string, FixtureCell[]>>) {
  const classes = Object.keys(cells);
  const items: ReturnType<typeof item>[] = [];
  let y = 800;

  classes.forEach((cls, index) => {
    const x = FIRST_GROUP_X + index * GROUP_WIDTH;
    items.push(item(cls, x + (ROOM_OFFSET - cls.length * CHAR_WIDTH) / 2, y));
    items.push(item('R', x + ROOM_OFFSET, y, 6));
  });
  y -= 20;

  for (const day of WEEKDAYS) {
    for (let period = 1; period <= 10; period++) {
      // Das Wochentagskürzel steht mitten im Tagesblock, nicht in dessen
      // erster Zeile — so wie im Original.
      if (period === 7) items.push(item(day, 20, y, 14));
      items.push(item(`${period}.`, 48, y, 10));
      items.push(item(PERIOD_TIMES[period], 66, y, 52));

      classes.forEach((cls, index) => {
        const x = FIRST_GROUP_X + index * GROUP_WIDTH;
        const cell = (cells[cls][day] ?? []).find(
          (candidate) => period >= candidate.period && period < candidate.period + candidate.span,
        );
        if (!cell) return;
        const line = period - cell.period;

        // Eine über den ganzen Tag verbundene Zelle bricht ihren Text um.
        if (cell.span > 2) {
          const word = cell.text.split(' ')[line];
          if (word) items.push(item(word, x + 4, y, Math.min(word.length * CHAR_WIDTH, 70)));
          return;
        }

        if (line === 0) {
          if (cell.text) items.push(item(cell.text, x, y, Math.min(cell.text.length * CHAR_WIDTH, 70)));
          if (cell.room && (cell.span === 1 || cell.roomOnFirstLine)) {
            items.push(item(cell.room, x + ROOM_OFFSET, y, cell.room.length * CHAR_WIDTH));
          }
        } else {
          if (cell.teacher) items.push(item(cell.teacher, x, y, cell.teacher.length * CHAR_WIDTH));
          if (cell.room && !cell.roomOnFirstLine) {
            items.push(item(cell.room, x + ROOM_OFFSET, y, cell.room.length * CHAR_WIDTH));
          }
        }
      });

      y -= 12;
      if (period === 6) y -= 6; // Mittagspause
    }
    y -= 10;
  }

  return items;
}

function fakePdf(items: ReturnType<typeof renderWeek>) {
  return () => ({
    promise: Promise.resolve({
      numPages: 1,
      getPage: async () => ({ getTextContent: async () => ({ items }) }),
    }),
  });
}

describe('Ganze Planwoche', () => {
  it('liest die Woche Zelle für Zelle korrekt zurück', async () => {
    const { schedule } = await parseTimetablePdf(new ArrayBuffer(0), fakePdf(renderWeek(ZELLEN)));

    expect(schedule).toEqual(ERWARTET);
  });

  it('hält Fach, Lehrkraft und Raum auseinander', async () => {
    const { schedule } = await parseTimetablePdf(new ArrayBuffer(0), fakePdf(renderWeek(ZELLEN)));

    const lessons = Object.values(schedule).flatMap((week) =>
      WEEKDAYS.flatMap((day) => week[day]),
    );

    // Kein Raum darf im Fachnamen hängen geblieben sein.
    expect(lessons.filter((lesson) => /\s\d{1,2}(\/\d{1,2})?$/.test(lesson.subject ?? ''))).toEqual([]);
    // Und kein Lehrerkürzel als Fach dastehen.
    expect(lessons.filter((lesson) => lesson.subject === 'MEL' || lesson.subject === 'STI')).toEqual([]);
  });

  it('meldet für eine saubere Woche keine Warnungen', async () => {
    const { warnings } = await parseTimetablePdf(new ArrayBuffer(0), fakePdf(renderWeek(ZELLEN)));

    expect(warnings).toEqual([]);
  });
});
