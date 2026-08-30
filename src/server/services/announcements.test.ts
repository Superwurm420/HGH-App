import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Announcement } from '../types';
import { loadActiveAnnouncements, matchesClass, splitClasses } from './announcements';

describe('splitClasses', () => {
  it('trennt an Kommas, entfernt Leerzeichen und normalisiert', () => {
    expect(splitClasses(' ht11 , G21 ')).toEqual(['HT11', 'G21']);
  });

  it('liefert eine leere Liste für leere Werte', () => {
    expect(splitClasses('')).toEqual([]);
    expect(splitClasses(null)).toEqual([]);
    expect(splitClasses(undefined)).toEqual([]);
  });

  it('verwirft leere Einträge zwischen Kommas', () => {
    expect(splitClasses('HT11,,G21,')).toEqual(['HT11', 'G21']);
  });
});

describe('matchesClass', () => {
  it('gilt für alle Klassen, wenn keine eingeschränkt ist', () => {
    expect(matchesClass('', 'HT11')).toBe(true);
    expect(matchesClass(null, 'G21')).toBe(true);
  });

  it('gilt nur für die genannten Klassen', () => {
    expect(matchesClass('HT11, G21', 'HT11')).toBe(true);
    expect(matchesClass('HT11, G21', 'HT12')).toBe(false);
  });

  it('vergleicht unabhängig von der Schreibweise', () => {
    expect(matchesClass('ht11', 'HT11')).toBe(true);
  });
});

/** Minimal-Datenbank: liefert immer denselben Satz Zeilen zurück. */
function fakeDb(rows: Partial<Announcement>[]): D1Database {
  const results = rows.map((row) => ({
    id: 'x', title: 'T', body: '', date: '', expires: null,
    classes: '', highlight: 0,
    created_by: null, created_at: '', updated_at: '',
    ...row,
  })) as Announcement[];

  return {
    prepare: () => ({ all: async () => ({ results }) }),
  } as unknown as D1Database;
}

describe('loadActiveAnnouncements', () => {
  // Ankündigungen speichern "TT.MM.JJJJ HH:mm". Ein Vergleich dieser
  // Zeichenkette gegen ein ISO-Datum im SQL scheiterte genau am Monatsanfang.
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-28T10:00:00+02:00'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('behält eine Ankündigung, die erst im nächsten Monat abläuft', async () => {
    const rows = await loadActiveAnnouncements(
      fakeDb([{ id: 'sept', expires: '01.09.2026 12:00' }]),
    );

    expect(rows.map((r) => r.id)).toEqual(['sept']);
  });

  it('entfernt eine Ankündigung, die diesen Monat abgelaufen ist', async () => {
    const rows = await loadActiveAnnouncements(
      fakeDb([{ id: 'alt', expires: '01.08.2026 12:00' }]),
    );

    expect(rows).toEqual([]);
  });

  it('behält Ankündigungen ohne Ablaufdatum', async () => {
    const rows = await loadActiveAnnouncements(
      fakeDb([{ id: 'leer', expires: '' }, { id: 'null', expires: null }]),
    );

    expect(rows).toHaveLength(2);
  });

  it('behält Ankündigungen mit unlesbarem Ablaufdatum, statt sie zu verschlucken', async () => {
    const rows = await loadActiveAnnouncements(fakeDb([{ id: 'krumm', expires: 'demnächst' }]));

    expect(rows.map((r) => r.id)).toEqual(['krumm']);
  });

  it('sortiert hervorgehobene nach oben, dann nach Datum absteigend', async () => {
    const rows = await loadActiveAnnouncements(
      fakeDb([
        { id: 'alt', date: '02.03.2026 08:00' },
        { id: 'neu', date: '27.08.2026 08:00' },
        { id: 'wichtig', date: '01.01.2026 08:00', highlight: 1 },
      ]),
    );

    expect(rows.map((r) => r.id)).toEqual(['wichtig', 'neu', 'alt']);
  });

  it('filtert nach Klasse, wenn eine übergeben wird', async () => {
    const rows = await loadActiveAnnouncements(
      fakeDb([
        { id: 'alle', classes: '' },
        { id: 'nur-ht11', classes: 'HT11' },
        { id: 'nur-g21', classes: 'G21' },
      ]),
      'HT11',
    );

    expect(rows.map((r) => r.id)).toEqual(['alle', 'nur-ht11']);
  });
});
