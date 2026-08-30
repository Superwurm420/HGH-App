import { describe, expect, it } from 'vitest';

import { collectClassLessonStates, hasOngoingSchoolDay, minutesUntilStart } from './next-lessons';
import type { ParsedSchedule } from './types';

function emptyWeek() {
  return { MO: [], DI: [], MI: [], DO: [], FR: [] };
}

const schedule: ParsedSchedule = {
  HT11: {
    ...emptyWeek(),
    MO: [
      { period: 1, periodEnd: 2, time: '8.00 - 9.30', subject: 'Mathe', room: '101' },
      { period: 3, time: '09:45-10:30', subject: 'Deutsch', room: '102' },
      { period: 4, time: '10:30-11:15', subject: 'Politik' },
    ],
  },
  G21: {
    ...emptyWeek(),
    MO: [
      { period: 3, time: '09:45-10:30', subject: 'Technik' },
      { period: 9, time: 'ganztägig', subject: 'Projekt' },
    ],
  },
};

describe('collectClassLessonStates', () => {
  it('liefert die laufende und die folgende Stunde', () => {
    const [g21, ht11] = collectClassLessonStates(schedule, 'MO', 8 * 60 + 30);

    expect(ht11.schoolClass).toBe('HT11');
    expect(ht11.current?.subject).toBe('Mathe');
    expect(ht11.next?.subject).toBe('Deutsch');

    // G21 hat um 8:30 noch keinen Unterricht — nur eine kommende Stunde.
    expect(g21.current).toBeNull();
    expect(g21.next?.subject).toBe('Technik');
  });

  it('lässt Stunden ohne lesbare Zeitangabe aus', () => {
    const [g21] = collectClassLessonStates(schedule, 'MO', 12 * 60);
    expect(g21.current).toBeNull();
    expect(g21.next).toBeNull();
  });

  it('kennt nach der letzten Stunde weder laufende noch nächste', () => {
    const states = collectClassLessonStates(schedule, 'MO', 12 * 60);
    expect(hasOngoingSchoolDay(states)).toBe(false);
  });

  it('sieht den Schultag vor Unterrichtsbeginn als laufend an', () => {
    const states = collectClassLessonStates(schedule, 'MO', 6 * 60);
    expect(hasOngoingSchoolDay(states)).toBe(true);
  });

  it('meldet in der Pause die nächste Stunde ohne laufende', () => {
    const states = collectClassLessonStates(schedule, 'MO', 9 * 60 + 35);
    const ht11 = states.find((state) => state.schoolClass === 'HT11');
    expect(ht11?.current).toBeNull();
    expect(ht11?.next?.subject).toBe('Deutsch');
  });
});

describe('minutesUntilStart', () => {
  it('zählt bis zum Beginn', () => {
    expect(minutesUntilStart({ period: 3, time: '09:45-10:30' }, 9 * 60 + 33)).toBe(12);
  });

  it('gibt null ohne lesbare Zeit zurück', () => {
    expect(minutesUntilStart({ period: 9, time: 'ganztägig' }, 600)).toBeNull();
  });
});
