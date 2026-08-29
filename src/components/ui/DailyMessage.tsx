'use client';

import { useEffect, useState } from 'react';
import { LessonEntry } from '@/lib/timetable/types';
import { parseLessonTimeRange, type TimeRange } from '@/lib/timetable/lesson-times';
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
};

function getTimeCategoryFromLessons(
  nowMinutes: number,
  lessons: LessonEntry[],
): 'vorUnterricht' | 'inPause' | 'nachUnterricht' {
  const slots = lessons
    .map((lesson) => parseLessonTimeRange(lesson.time))
    .filter((slot): slot is TimeRange => slot !== null)
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

function getFreeDayCategory(date: BerlinDateParts, ranges: SchoolHolidayRange[]): 'feiertag' | 'freierTag' {
  if (isLowerSaxonyPublicHoliday(date)) return 'feiertag';
  if (isDateInSchoolHolidayRanges(date, ranges)) return 'freierTag';
  return 'freierTag';
}

export function DailyMessage({
  messages,
  schoolClass,
  lessons = [],
  schoolHolidays = [],
}: {
  messages: MessagesData;
  schoolClass?: string;
  lessons?: LessonEntry[];
  schoolHolidays?: SchoolHolidayRange[];
}) {
  const [text, setText] = useState('');

  useEffect(() => {
    const classKey = schoolClass?.trim().toUpperCase() ?? '';

    const updateMessage = () => {
      const now = getBerlinNowParts();
      const nowMinutes = timeToMinutes(now.hour, now.minute);
      const isWeekendDay = checkWeekend(now.weekdayShort);

      const freeDayCategory = lessons.length === 0 ? getFreeDayCategory(now, schoolHolidays) : null;

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

      if (!standardCategory) {
        setText('');
        return;
      }

      const classPool = (classKey ? messages.klassen?.[classKey]?.[standardCategory] : undefined) ?? [];
      const standardPool = messages.standard?.[standardCategory] ?? [];

      // Ein freier Tag ohne eigene Texte greift auf die Feiertagstexte zurück.
      const freeDayFallbackPool =
        standardCategory === 'freierTag'
          ? [
              ...((classKey ? messages.klassen?.[classKey]?.feiertag : undefined) ?? []),
              ...(messages.standard?.feiertag ?? []),
            ]
          : [];

      const pool =
        classPool.length > 0 ? classPool : standardPool.length > 0 ? standardPool : freeDayFallbackPool;

      setText(pickMessage(pool, categorySeed[standardCategory]));
    };

    updateMessage();
    const intervalId = window.setInterval(updateMessage, 60_000);

    return () => window.clearInterval(intervalId);
  }, [lessons, messages, schoolClass, schoolHolidays]);

  if (!text) return null;

  return (
    <div className={styles.dailyMessage}>
      <p className={styles.dailyMessageText}>{text}</p>
    </div>
  );
}
