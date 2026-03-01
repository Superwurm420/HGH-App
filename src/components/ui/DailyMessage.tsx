'use client';

import { useEffect, useState } from 'react';
import { LessonEntry } from '@/lib/timetable/types';
import {
  isDateInSchoolHolidayRanges,
  isLowerSaxonyPublicHoliday,
  type BerlinDateParts,
  type SchoolHolidayRange,
} from '@/lib/calendar/lowerSaxonySchoolFreeDays';
import {
  getBerlinNowParts,
  timeToMinutes,
  isWeekend as checkWeekend,
} from '@/lib/berlin-time';
import schoolHolidaysData from '@/generated/school-holidays-data.json';
import styles from './DailyMessage.module.css';

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
  klassen?: Record<
    string,
    {
      vorUnterricht?: string[];
      inPause?: string[];
      nachUnterricht?: string[];
      wochenende?: string[];
      feiertag?: string[];
      freierTag?: string[];
    }
  >;
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

function parseTime(value: string): number {
  const [h, m] = value.split(':').map(Number);
  return timeToMinutes(h, m);
}

function getLegacyTimeCategory(hour: number, isWeekendDay: boolean): string {
  if (isWeekendDay) return 'wochenende';
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

function getFreeDayCategory(date: BerlinDateParts): 'feiertag' | 'freierTag' {
  if (isLowerSaxonyPublicHoliday(date)) return 'feiertag';
  if (isDateInSchoolHolidayRanges(date, schoolHolidayRanges)) return 'freierTag';
  return 'freierTag';
}

export function DailyMessage({
  messages,
  schoolClass,
  lessons = [],
}: {
  messages: MessagesData;
  schoolClass?: string;
  lessons?: LessonEntry[];
}) {
  const [text, setText] = useState('');

  useEffect(() => {
    const classKey = schoolClass?.trim().toUpperCase() ?? '';

    const updateMessage = () => {
      const now = getBerlinNowParts();
      const nowMinutes = timeToMinutes(now.hour, now.minute);
      const isWeekendDay = checkWeekend(now.weekdayShort);

      const freeDayCategory = lessons.length === 0 ? getFreeDayCategory(now) : null;

      const standardCategory: StandardCategory | null = isWeekendDay
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
        const classPool =
          ((classKey ? messages.klassen?.[classKey]?.[standardCategory] : undefined) as string[] | undefined) ?? [];
        const standardPool = (messages.standard?.[standardCategory] as string[] | undefined) ?? [];
        const freeDayFallbackPool =
          standardCategory === 'freierTag'
            ? [
                ...((((classKey ? messages.klassen?.[classKey]?.feiertag : undefined) as string[] | undefined) ?? [])),
                ...(((messages.standard?.feiertag as string[] | undefined) ?? [])),
              ]
            : [];

        if (classPool.length > 0 || standardPool.length > 0 || freeDayFallbackPool.length > 0) {
          const pool = classPool.length > 0 ? classPool : standardPool.length > 0 ? standardPool : freeDayFallbackPool;
          setText(pickMessage(pool, categorySeed[standardCategory] ?? 0));
          return;
        }
      }

      const legacyCategory = getLegacyTimeCategory(now.hour, isWeekendDay);
      const legacyGeneral = (messages[legacyCategory] as string[] | undefined) ?? [];
      setText(pickMessage(legacyGeneral, 0));
    };

    updateMessage();
    const intervalId = window.setInterval(updateMessage, 60_000);

    return () => window.clearInterval(intervalId);
  }, [lessons, messages, schoolClass]);

  if (!text) return null;

  return (
    <div className={styles.dailyMessage}>
      <p className={styles.dailyMessageText}>{text}</p>
    </div>
  );
}
