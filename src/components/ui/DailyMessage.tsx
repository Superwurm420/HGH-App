'use client';

import { useEffect, useState } from 'react';
import { LessonEntry } from '@/lib/timetable/types';
import {
  isDateInSchoolHolidayRanges,
  isLowerSaxonyPublicHoliday,
  type BerlinDateParts,
  type SchoolHolidayRange,
} from '@/lib/calendar/lowerSaxonySchoolFreeDays';
import schoolHolidaysData from '@/generated/school-holidays-data.json';

type MessagesData = {
  _hinweis?: string;
  standard?: {
    vorUnterricht?: string[];
    inPause?: string[];
    nachUnterricht?: string[];
    wochenende?: string[];
    feiertag?: string[];
    freierTag?: string[];
  };
  // Legacy-Felder für Abwärtskompatibilität
  morgen?: string[];
  mittag?: string[];
  nachmittag?: string[];
  schulschluss?: string[];
  [key: string]: unknown;
};

type SchoolHolidaysData = {
  ranges?: SchoolHolidayRange[];
};

const schoolHolidayRanges = ((schoolHolidaysData as SchoolHolidaysData).ranges ?? []).filter(
  (range) => typeof range.start === 'string' && typeof range.end === 'string',
);

function timeToMinutes(h: number, m: number): number {
  return h * 60 + m;
}

function parseTime(value: string): number {
  const [h, m] = value.split(':').map(Number);
  return timeToMinutes(h, m);
}

function getBerlinNowParts(): BerlinDateParts & { hour: number; minute: number; weekdayShort: string } {
  const parts = new Intl.DateTimeFormat('de-DE', {
    timeZone: 'Europe/Berlin',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    weekday: 'short',
    hour12: false,
  }).formatToParts(new Date());

  return {
    year: Number(parts.find((p) => p.type === 'year')?.value ?? 0),
    month: Number(parts.find((p) => p.type === 'month')?.value ?? 0),
    day: Number(parts.find((p) => p.type === 'day')?.value ?? 0),
    hour: Number(parts.find((p) => p.type === 'hour')?.value ?? 0),
    minute: Number(parts.find((p) => p.type === 'minute')?.value ?? 0),
    weekdayShort: parts.find((p) => p.type === 'weekday')?.value ?? '',
  };
}

function getLegacyTimeCategory(hour: number, isWeekend: boolean): string {
  if (isWeekend) return 'wochenende';
  if (hour < 10) return 'morgen';
  if (hour < 13) return 'mittag';
  if (hour < 17) return 'nachmittag';
  return 'schulschluss';
}

function normalizeTime(value: string): string | null {
  const match = value.match(/(\d{1,2})[:.](\d{2})/);
  if (!match) return null;
  return `${match[1].padStart(2, '0')}:${match[2]}`;
}

function getTimeCategoryFromLessons(
  nowMinutes: number,
  lessons: LessonEntry[],
): 'vorUnterricht' | 'inPause' | 'nachUnterricht' {
  const slots = lessons
    .map((lesson) => {
      const parts = lesson.time.split('-').map((part) => part.trim());
      if (parts.length < 2) return null;
      const start = normalizeTime(parts[0]);
      const end = normalizeTime(parts[1]);
      if (!start || !end) return null;
      return { start: parseTime(start), end: parseTime(end) };
    })
    .filter((s): s is { start: number; end: number } => s !== null)
    .sort((a, b) => a.start - b.start);

  if (slots.length === 0) return 'inPause';

  const firstStart = slots[0].start;
  const lastEnd = slots[slots.length - 1].end;

  if (nowMinutes < firstStart) return 'vorUnterricht';
  if (nowMinutes >= lastEnd) return 'nachUnterricht';
  return 'inPause';
}

function pickMessage(pool: string[], seed: number = 0): string {
  if (pool.length === 0) return '';
  const dayOfYear = Math.floor(Date.now() / (1000 * 60 * 60 * 24));
  return pool[(dayOfYear * 13 + seed) % pool.length];
}

type StandardCategory =
  | 'vorUnterricht'
  | 'inPause'
  | 'nachUnterricht'
  | 'wochenende'
  | 'feiertag'
  | 'freierTag';

function getFreeDayCategory(date: BerlinDateParts): 'feiertag' | 'freierTag' | null {
  if (isLowerSaxonyPublicHoliday(date)) return 'feiertag';
  if (isDateInSchoolHolidayRanges(date, schoolHolidayRanges)) return 'freierTag';
  return null;
}

export function DailyMessage({
  messages,
  lessons = [],
}: {
  messages: MessagesData;
  schoolClass?: string;
  lessons?: LessonEntry[];
}) {
  const [text, setText] = useState('');

  useEffect(() => {
    const now = getBerlinNowParts();
    const nowMinutes = timeToMinutes(now.hour, now.minute);
    const isWeekend = now.weekdayShort.startsWith('Sa') || now.weekdayShort.startsWith('So');

    const freeDayCategory = lessons.length === 0 ? getFreeDayCategory(now) : null;

    const standardCategory: StandardCategory | null = isWeekend
      ? 'wochenende'
      : freeDayCategory
        ? freeDayCategory
        : lessons.length > 0
          ? getTimeCategoryFromLessons(nowMinutes, lessons)
          : null;

    const categorySeed: Record<StandardCategory, number> = {
      vorUnterricht: 20,
      inPause: 21,
      nachUnterricht: 22,
      wochenende: 23,
      feiertag: 24,
      freierTag: 25,
    };

    if (standardCategory) {
      const standardPool = (messages.standard?.[standardCategory] as string[] | undefined) ?? [];
      const freeDayFallbackPool =
        standardCategory === 'freierTag'
          ? (messages.standard?.feiertag as string[] | undefined) ?? []
          : [];

      if (standardPool.length > 0 || freeDayFallbackPool.length > 0) {
        const pool = standardPool.length > 0 ? standardPool : freeDayFallbackPool;
        setText(pickMessage(pool, categorySeed[standardCategory] ?? 0));
        return;
      }
    }

    const legacyCategory = getLegacyTimeCategory(now.hour, isWeekend);
    const legacyGeneral = (messages[legacyCategory] as string[] | undefined) ?? [];
    setText(pickMessage(legacyGeneral, 0));
  }, [lessons, messages]);

  if (!text) return null;

  return (
    <div className="daily-message">
      <p className="daily-message-text">{text}</p>
    </div>
  );
}
