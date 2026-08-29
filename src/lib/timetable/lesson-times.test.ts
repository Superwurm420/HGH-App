import { describe, expect, it } from 'vitest';

import { isLessonRunning, parseLessonTimeRange } from './lesson-times';

describe('parseLessonTimeRange', () => {
  it('liest die Schreibweise mit Punkt aus dem PDF', () => {
    expect(parseLessonTimeRange('8.00 - 9.30')).toEqual({ start: 480, end: 570 });
  });

  it('liest die Schreibweise mit Doppelpunkt', () => {
    expect(parseLessonTimeRange('08:00-09:30')).toEqual({ start: 480, end: 570 });
  });

  it('kommt ohne Leerzeichen und mit einstelliger Stunde aus', () => {
    expect(parseLessonTimeRange('9.45-11.15')).toEqual({ start: 585, end: 675 });
  });

  it('gibt null zurück, wenn keine Endzeit dabeisteht', () => {
    expect(parseLessonTimeRange('8.00')).toBeNull();
  });

  it('gibt null zurück bei unsinnigen Uhrzeiten', () => {
    expect(parseLessonTimeRange('25:00 - 26:00')).toBeNull();
    expect(parseLessonTimeRange('8.00 - 9.75')).toBeNull();
  });

  it('gibt null zurück bei leerem Text', () => {
    expect(parseLessonTimeRange('')).toBeNull();
  });
});

describe('isLessonRunning', () => {
  const lesson = { period: 1, time: '8.00 - 9.30' };

  it('erkennt die laufende Stunde', () => {
    expect(isLessonRunning(lesson, 8 * 60)).toBe(true);
    expect(isLessonRunning(lesson, 9 * 60)).toBe(true);
  });

  it('zählt die Endminute nicht mehr dazu — sonst wären zwei Stunden gleichzeitig aktiv', () => {
    expect(isLessonRunning(lesson, 9 * 60 + 30)).toBe(false);
  });

  it('ist vor Beginn nicht aktiv', () => {
    expect(isLessonRunning(lesson, 7 * 60 + 59)).toBe(false);
  });

  it('markiert eine Stunde ohne lesbare Zeit nicht', () => {
    expect(isLessonRunning({ period: 1, time: 'ganztägig' }, 600)).toBe(false);
  });
});
