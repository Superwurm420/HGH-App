import { describe, expect, it } from 'vitest';

import { resolveSelectedClass } from './select-class';

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
