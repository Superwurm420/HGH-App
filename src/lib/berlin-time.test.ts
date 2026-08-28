import { describe, expect, it } from 'vitest';

import { getBerlinNowParts, isWeekend, parseBerlinDate, weekdayForToday } from './berlin-time';

/** 12:00 UTC — sicher derselbe Kalendertag in Berlin. */
function atNoon(isoDate: string): Date {
  return new Date(`${isoDate}T12:00:00Z`);
}

describe('weekdayForToday', () => {
  it('ordnet jeden Schultag seinem Stundenplan-Code zu', () => {
    expect(weekdayForToday(atNoon('2026-08-24'))).toBe('MO');
    expect(weekdayForToday(atNoon('2026-08-25'))).toBe('DI');
    expect(weekdayForToday(atNoon('2026-08-26'))).toBe('MI');
    expect(weekdayForToday(atNoon('2026-08-27'))).toBe('DO');
    expect(weekdayForToday(atNoon('2026-08-28'))).toBe('FR');
  });

  it('zeigt am Wochenende den Montag — der Plan hat dafür keine Spalte', () => {
    expect(weekdayForToday(atNoon('2026-08-29'))).toBe('MO');
    expect(weekdayForToday(atNoon('2026-08-30'))).toBe('MO');
  });

  // de-DE hängt im kombinierten Datums-/Zeit-Format einen Punkt an den
  // Kurznamen. Ein Nachschlagen mit dem ungekürzten Wert traf nie zu, und der
  // Plan zeigte an jedem Wochentag den Montag.
  it('kommt mit dem Punkt im Kurznamen zurecht', () => {
    expect(getBerlinNowParts(atNoon('2026-08-28')).weekdayShort).toMatch(/^Fr\.?$/);
    expect(weekdayForToday(atNoon('2026-08-28'))).not.toBe('MO');
  });
});

describe('isWeekend', () => {
  it('erkennt Samstag und Sonntag, mit und ohne Punkt', () => {
    expect(isWeekend('Sa')).toBe(true);
    expect(isWeekend('So.')).toBe(true);
    expect(isWeekend('Fr.')).toBe(false);
  });
});

describe('parseBerlinDate', () => {
  it('liest ein deutsches Datum in Sommerzeit (CEST, +02:00)', () => {
    expect(parseBerlinDate('01.09.2026 12:00')?.toISOString()).toBe('2026-09-01T10:00:00.000Z');
  });

  it('liest ein deutsches Datum in Winterzeit (CET, +01:00)', () => {
    expect(parseBerlinDate('15.01.2026 12:00')?.toISOString()).toBe('2026-01-15T11:00:00.000Z');
  });

  it('weist ungültige Eingaben zurück', () => {
    expect(parseBerlinDate('2026-09-01T12:00')).toBeNull();
    expect(parseBerlinDate('demnächst')).toBeNull();
    expect(parseBerlinDate('')).toBeNull();
    expect(parseBerlinDate('32.01.2026 12:00')).toBeNull();
  });
});
