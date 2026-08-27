import { describe, expect, it } from 'vitest';

import { buildEntriesByClass, type TimetableEntryRow } from './timetable';

function row(overrides: Partial<TimetableEntryRow>): TimetableEntryRow {
  return {
    class_code: 'HT11',
    weekday: 'MO',
    period: 1,
    period_end: null,
    time_range: '8.00 - 8.45',
    subject: 'Mathe',
    detail: null,
    room: null,
    ...overrides,
  };
}

describe('buildEntriesByClass', () => {
  it('gruppiert Zeilen nach Klasse und Wochentag', () => {
    const { entries, classes } = buildEntriesByClass([
      row({}),
      row({ weekday: 'DI', subject: 'Sport' }),
      row({ class_code: 'G21', subject: 'Deutsch' }),
    ]);

    expect(classes).toEqual(['G21', 'HT11']);
    expect(entries.HT11.MO).toHaveLength(1);
    expect(entries.HT11.DI[0].subject).toBe('Sport');
    expect(entries.G21.MO[0].subject).toBe('Deutsch');
  });

  it('legt für jede Klasse alle fünf Wochentage an', () => {
    const { entries } = buildEntriesByClass([row({})]);
    expect(Object.keys(entries.HT11)).toEqual(['MO', 'DI', 'MI', 'DO', 'FR']);
    expect(entries.HT11.FR).toEqual([]);
  });

  it('lässt leere Spalten weg, statt sie als leere Texte auszuliefern', () => {
    const { entries } = buildEntriesByClass([row({ subject: null, detail: null, room: null })]);
    const lesson = entries.HT11.MO[0];

    expect(lesson).toEqual({ period: 1, time: '8.00 - 8.45' });
    expect('subject' in lesson).toBe(false);
  });

  it('übernimmt Doppelstunden über periodEnd', () => {
    const { entries } = buildEntriesByClass([row({ period: 1, period_end: 2 })]);
    expect(entries.HT11.MO[0].periodEnd).toBe(2);
  });

  it('überspringt Zeilen mit unbekanntem Wochentag', () => {
    const { entries, classes } = buildEntriesByClass([
      row({ weekday: 'SA' as TimetableEntryRow['weekday'] }),
    ]);

    expect(classes).toEqual([]);
    expect(entries).toEqual({});
  });

  it('liefert leere Ergebnisse für eine leere Eingabe', () => {
    expect(buildEntriesByClass([])).toEqual({ entries: {}, classes: [] });
  });
});
