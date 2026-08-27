import { describe, expect, it } from 'vitest';

import { ScheduleValidationError, summarizeSchedule, validateSchedule } from './schedule';

const VALID = {
  HT11: {
    MO: [{ period: 1, time: '8.00 - 8.45', subject: 'Mathe', room: '12' }],
    DI: [{ period: 1, time: '8.00 - 8.45', subject: 'Sport' }],
    MI: [],
    DO: [],
    FR: [],
  },
};

describe('validateSchedule', () => {
  it('übernimmt einen gültigen Stundenplan', () => {
    const result = validateSchedule(VALID);
    expect(result.HT11.MO[0]).toEqual({
      period: 1,
      time: '8.00 - 8.45',
      subject: 'Mathe',
      room: '12',
    });
  });

  it('normalisiert Klassencodes auf Großbuchstaben', () => {
    const result = validateSchedule({ ht11: VALID.HT11 });
    expect(Object.keys(result)).toEqual(['HT11']);
  });

  it('sortiert die Stunden eines Tages nach Stundennummer', () => {
    const result = validateSchedule({
      HT11: {
        MO: [
          { period: 3, time: '10.00 - 10.45' },
          { period: 1, time: '8.00 - 8.45' },
        ],
        DI: [], MI: [], DO: [], FR: [],
      },
    });
    expect(result.HT11.MO.map((lesson) => lesson.period)).toEqual([1, 3]);
  });

  it('ergänzt fehlende Wochentage als leere Liste', () => {
    const result = validateSchedule({ HT11: { MO: VALID.HT11.MO } });
    expect(result.HT11.FR).toEqual([]);
  });

  // Der Stundenplan wird im Browser geparst — der Server darf ihm nicht trauen.
  it.each([
    ['leeres Objekt', {}],
    ['kein Objekt', 'HT11'],
    ['unbekannter Klassencode', { 'Klasse 1': VALID.HT11 }],
    ['Stundennummer keine Zahl', { HT11: { MO: [{ period: '1', time: 'x' }] } }],
    ['Stundennummer zu groß', { HT11: { MO: [{ period: 99, time: 'x' }] } }],
    ['periodEnd vor period', { HT11: { MO: [{ period: 5, periodEnd: 2, time: 'x' }] } }],
    ['Stundenliste kein Array', { HT11: { MO: 'Mathe' } }],
    ['keine einzige Stunde', { HT11: { MO: [], DI: [], MI: [], DO: [], FR: [] } }],
  ])('weist ungültige Daten ab: %s', (_label, input) => {
    expect(() => validateSchedule(input)).toThrow(ScheduleValidationError);
  });

  it('lehnt überlange Texte ab, statt sie in die Datenbank zu schreiben', () => {
    const tooLong = { HT11: { MO: [{ period: 1, time: '8.00', subject: 'x'.repeat(500) }] } };
    expect(() => validateSchedule(tooLong)).toThrow(/Zeichen/);
  });
});

describe('summarizeSchedule', () => {
  it('zählt Klassen und Stunden', () => {
    expect(summarizeSchedule(validateSchedule(VALID))).toEqual({ classes: 1, entries: 2 });
  });
});
