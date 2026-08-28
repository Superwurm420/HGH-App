import { describe, expect, it } from 'vitest';

import { buildR2Key, normalizeHalfYear, toAsciiMetadata } from './upload-naming';

const ASCII_ONLY = /^[\x20-\x7E]*$/;

describe('toAsciiMetadata', () => {
  it('macht Umlaute für den R2-Metadaten-Header ASCII-sicher', () => {
    const value = toAsciiMetadata('Stundenplan_kw_35_Hj1_2026_27_Übersicht.pdf');
    expect(value).toMatch(ASCII_ONLY);
    expect(decodeURIComponent(value)).toBe('Stundenplan_kw_35_Hj1_2026_27_Übersicht.pdf');
  });

  it('kürzt sehr lange Namen', () => {
    expect(toAsciiMetadata('ä'.repeat(2000)).length).toBeLessThanOrEqual(1024);
  });
});

describe('buildR2Key', () => {
  it('transliteriert Umlaute und behält die Endung', () => {
    const key = buildR2Key('Stundenplan_kw_35_Hj1_2026_27_Übersicht.pdf', 1700000000000);
    expect(key).toBe('timetables/1700000000000_Stundenplan_kw_35_Hj1_2026_27_Uebersicht.pdf');
  });

  it('ersetzt Leerzeichen und Sonderzeichen', () => {
    const key = buildR2Key('Plan 35 (final)#1.pdf', 1);
    expect(key).toMatch(ASCII_ONLY);
    expect(key).toBe('timetables/1_Plan_35_final_1.pdf');
  });

  it('liefert auch bei rein exotischen Namen einen brauchbaren Schlüssel', () => {
    expect(buildR2Key('★★★', 1)).toBe('timetables/1__');
  });
});

describe('normalizeHalfYear', () => {
  it('lässt 1 und 2 durch', () => {
    expect(normalizeHalfYear(1)).toBe(1);
    expect(normalizeHalfYear(2)).toBe(2);
  });

  it('verwirft Werte, die den CHECK in D1 verletzen würden', () => {
    expect(normalizeHalfYear(3)).toBeNull();
    expect(normalizeHalfYear(0)).toBeNull();
    expect(normalizeHalfYear(undefined)).toBeNull();
    expect(normalizeHalfYear(null)).toBeNull();
  });
});
