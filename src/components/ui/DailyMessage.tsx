'use client';

import { useEffect, useState } from 'react';
import { LessonEntry } from '@/lib/timetable/types';

type MessageMap = Record<string, string[]>;

type ClassMessages = {
  allgemein?: string[];
  stunden?: MessageMap;
};

type MessagesData = {
  _hinweis?: string;
  standard?: {
    vorUnterricht?: string[];
    inPause?: string[];
    nachUnterricht?: string[];
    wochenende?: string[];
  };
  stunden?: MessageMap;
  klassen?: Record<string, string[] | ClassMessages>;
  // Legacy-Felder für Abwärtskompatibilität
  morgen?: string[];
  mittag?: string[];
  nachmittag?: string[];
  schulschluss?: string[];
  wochenende?: string[];
  [key: string]: unknown;
};

const DEFAULT_SCHEDULE = [
  { period: 1, start: '08:30', end: '09:15' },
  { period: 2, start: '09:15', end: '10:00' },
  { period: 3, start: '10:20', end: '11:05' },
  { period: 4, start: '11:05', end: '11:50' },
  { period: 5, start: '12:00', end: '12:45' },
  { period: 6, start: '12:45', end: '13:30' },
  { period: 7, start: '14:15', end: '15:00' },
  { period: 8, start: '15:00', end: '15:45' },
  { period: 9, start: '15:45', end: '16:30' },
  { period: 10, start: '16:30', end: '17:15' },
] as const;

function timeToMinutes(h: number, m: number): number {
  return h * 60 + m;
}

function parseTime(value: string): number {
  const [h, m] = value.split(':').map(Number);
  return timeToMinutes(h, m);
}

function getBerlinNowParts(): { hour: number; minute: number; weekdayShort: string } {
  const parts = new Intl.DateTimeFormat('de-DE', {
    timeZone: 'Europe/Berlin',
    hour: '2-digit',
    minute: '2-digit',
    weekday: 'short',
    hour12: false,
  }).formatToParts(new Date());

  return {
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

function getCurrentOrNextPeriodFromLessons(nowMinutes: number, lessons: LessonEntry[]): number | null {
  const lessonSlots = lessons
    .map((lesson) => {
      const parts = lesson.time.split('-').map((part) => part.trim());
      if (parts.length < 2) return null;
      const start = normalizeTime(parts[0]);
      const end = normalizeTime(parts[1]);
      if (!start || !end) return null;
      return { period: lesson.period, start: parseTime(start), end: parseTime(end) };
    })
    .filter((slot): slot is { period: number; start: number; end: number } => slot !== null)
    .sort((a, b) => a.start - b.start);

  for (const slot of lessonSlots) {
    if (nowMinutes >= slot.start && nowMinutes < slot.end) return slot.period;
    if (slot.start > nowMinutes) return slot.period;
  }

  return null;
}

function getCurrentOrNextPeriod(nowMinutes: number): number | null {
  for (const slot of DEFAULT_SCHEDULE) {
    const start = parseTime(slot.start);
    const end = parseTime(slot.end);
    if (nowMinutes >= start && nowMinutes < end) return slot.period;
    if (start > nowMinutes) return slot.period;
  }
  return null;
}

function pickMessage(pool: string[]): string {
  if (pool.length === 0) return '';
  // Gleiche Meldung den ganzen Tag – wechselt täglich
  const dayOfYear = Math.floor(Date.now() / (1000 * 60 * 60 * 24));
  return pool[dayOfYear % pool.length];
}

function normalizeClassMessages(value: string[] | ClassMessages | undefined): ClassMessages {
  if (!value) return {};
  if (Array.isArray(value)) return { allgemein: value };
  return value;
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
    const now = getBerlinNowParts();
    const nowMinutes = timeToMinutes(now.hour, now.minute);
    const isWeekend = now.weekdayShort.startsWith('Sa') || now.weekdayShort.startsWith('So');

    const period = isWeekend
      ? null
      : lessons.length > 0
        ? getCurrentOrNextPeriodFromLessons(nowMinutes, lessons)
        : getCurrentOrNextPeriod(nowMinutes);
    const classMessages = normalizeClassMessages(
      schoolClass ? messages.klassen?.[schoolClass] : undefined,
    );

    const periodPool = period
      ? [
          ...((messages.stunden?.[String(period)] as string[] | undefined) ?? []),
          ...((classMessages.stunden?.[String(period)] as string[] | undefined) ?? []),
          ...((classMessages.stunden?.[String(period)] as string[] | undefined) ?? []),
        ]
      : [];

    if (periodPool.length > 0) {
      setText(pickMessage(periodPool));
      return;
    }

    const standardCategory = isWeekend
      ? 'wochenende'
      : nowMinutes < parseTime(DEFAULT_SCHEDULE[0].start)
        ? 'vorUnterricht'
        : nowMinutes >= parseTime(DEFAULT_SCHEDULE[DEFAULT_SCHEDULE.length - 1].end)
          ? 'nachUnterricht'
          : 'inPause';

    const standardPool = [
      ...((messages.standard?.[standardCategory] as string[] | undefined) ?? []),
      ...(classMessages.allgemein ?? []),
      ...(classMessages.allgemein ?? []),
    ];

    if (standardPool.length > 0) {
      setText(pickMessage(standardPool));
      return;
    }

    // Fallback für bestehende (ältere) messages.json-Struktur
    const legacyCategory = getLegacyTimeCategory(now.hour, isWeekend);
    const legacyGeneral = (messages[legacyCategory] as string[] | undefined) ?? [];
    const legacyClass = Array.isArray(messages.klassen?.[schoolClass ?? ''])
      ? (messages.klassen?.[schoolClass ?? ''] as string[])
      : [];
    const fallbackPool = legacyClass.length > 0
      ? [...legacyGeneral, ...legacyClass, ...legacyClass]
      : legacyGeneral;

    setText(pickMessage(fallbackPool));
  }, [lessons, messages, schoolClass]);

  if (!text) return null;

  return (
    <div className="daily-message">
      <p className="daily-message-text">{text}</p>
    </div>
  );
}
