import { describe, expect, it } from 'vitest';

import { parseTimetablePdf, parseTimetableFilename } from './parse-pdf';

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

/** Ein Textelement so, wie pdfjs es liefert. */
function item(str: string, x: number, y: number, width = 30) {
  return { str, transform: [1, 0, 0, 1, x, y], width };
}

/** Baut ein pdfjs-Dokument mit den übergebenen Textelementen nach. */
function fakePdf(items: ReturnType<typeof item>[]) {
  return () => ({
    promise: Promise.resolve({
      getPage: async () => ({
        getTextContent: async () => ({ items }),
      }),
    }),
  });
}

/**
 * Nachbau eines Stundenplan-Layouts: links die Zeitspalte, rechts je eine
 * Spalte pro Klasse. Jeder Tag beginnt mit einer Zeile "1. 8.00 - 8.45".
 */
const LAYOUT = [
  // Kopfzeile mit den Klassen
  item('HT11', 200, 800),
  item('G21', 400, 800),

  // Montag
  item('MO', 20, 760),
  item('1.', 50, 760),
  item('8.00 - 8.45', 80, 760),
  item('Mathe', 200, 760),
  item('Deutsch', 400, 760),

  item('2.', 50, 740),
  item('8.45 - 9.30', 80, 740),
  item('Mathe', 200, 740),
  item('Physik', 400, 740),

  // Dienstag
  item('DI', 20, 700),
  item('1.', 50, 700),
  item('8.00 - 8.45', 80, 700),
  item('Sport', 200, 700),
  item('Kunst', 400, 700),
];

describe('parseTimetablePdf', () => {
  it('erkennt Klassen, Tage und Stunden aus dem Textlayout', async () => {
    const schedule = await parseTimetablePdf(new ArrayBuffer(0), fakePdf(LAYOUT));

    expect(Object.keys(schedule).sort()).toEqual(['G21', 'HT11']);

    expect(schedule.HT11.MO.length).toBeGreaterThan(0);
    expect(schedule.HT11.MO[0].period).toBe(1);
    expect(schedule.HT11.MO[0].subject).toContain('Mathe');

    expect(schedule.G21.MO[0].subject).toContain('Deutsch');
    expect(schedule.HT11.DI[0].subject).toContain('Sport');
  });

  it('ordnet jede Stunde genau einer Klassenspalte zu', async () => {
    const schedule = await parseTimetablePdf(new ArrayBuffer(0), fakePdf(LAYOUT));

    // "Deutsch" steht in der Spalte von G21 und darf nicht bei HT11 auftauchen.
    const ht11Subjects = schedule.HT11.MO.map((lesson) => lesson.subject ?? '').join(' ');
    expect(ht11Subjects).not.toContain('Deutsch');
  });

  it('meldet einen Fehler, wenn keine Klassen im Kopf stehen', async () => {
    const withoutClasses = [
      item('1.', 50, 760),
      item('8.00 - 8.45', 80, 760),
    ];

    await expect(parseTimetablePdf(new ArrayBuffer(0), fakePdf(withoutClasses)))
      .rejects.toThrow(/Klassen/);
  });
});
