import { describe, expect, it } from 'vitest';

import { matchClass, resolveSelectedClass } from './select-class';

const CLASSES = ['G21', 'HT11', 'HT12'];

describe('resolveSelectedClass', () => {
  it('nimmt die gewünschte Klasse, wenn es sie gibt', () => {
    expect(resolveSelectedClass(CLASSES, 'HT12')).toBe('HT12');
  });

  it('ignoriert Groß-/Kleinschreibung und Leerzeichen', () => {
    expect(resolveSelectedClass(CLASSES, ' ht11 ')).toBe('HT11');
  });

  it('fällt auf die erste Klasse zurück, wenn keine gewünscht ist', () => {
    expect(resolveSelectedClass(CLASSES)).toBe('G21');
  });

  it('fällt auf die erste Klasse zurück, wenn die gewünschte nicht existiert', () => {
    expect(resolveSelectedClass(CLASSES, 'XY99')).toBe('G21');
  });

  it('liefert null, wenn es gar keine Klassen gibt', () => {
    expect(resolveSelectedClass([], 'HT11')).toBeNull();
  });
});

describe('resolveSelectedClass mit gespeicherter Klasse', () => {
  it('bevorzugt die URL vor der gespeicherten Klasse', () => {
    expect(resolveSelectedClass(CLASSES, 'HT12', 'G21')).toBe('HT12');
  });

  it('nimmt die gespeicherte Klasse, wenn die URL nichts vorgibt', () => {
    expect(resolveSelectedClass(CLASSES, null, 'HT11')).toBe('HT11');
  });

  it('nimmt die gespeicherte Klasse, wenn die URL-Klasse unbekannt ist', () => {
    expect(resolveSelectedClass(CLASSES, 'XY99', 'HT12')).toBe('HT12');
  });

  it('ignoriert eine gespeicherte Klasse, die es nicht mehr gibt', () => {
    expect(resolveSelectedClass(CLASSES, null, 'ALT99')).toBe('G21');
  });
});

describe('matchClass', () => {
  it('findet unabhängig von der Schreibweise', () => {
    expect(matchClass(CLASSES, 'ht11')).toBe('HT11');
  });

  it('liefert null für Unbekanntes und Leeres', () => {
    expect(matchClass(CLASSES, 'XY99')).toBeNull();
    expect(matchClass(CLASSES, '')).toBeNull();
    expect(matchClass(CLASSES, null)).toBeNull();
  });
});
