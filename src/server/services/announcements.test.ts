import { describe, expect, it } from 'vitest';

import { matchesClass, splitClasses } from './announcements';

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
