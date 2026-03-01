'use client';

import { useEffect, useState } from 'react';
import { NetworkDot } from './NetworkDot';
import { LessonEntry } from '@/lib/timetable/types';
import {
  getBerlinNowParts,
  getIsoCalendarWeek,
  timeToMinutes,
  isWeekend as checkWeekend,
} from '@/lib/berlin-time';


type CountdownSlot = {
  label: string;
  start: string;
  end: string;
};

function parseTime(s: string) {
  const [h, m] = s.split(':').map(Number);
  return timeToMinutes(h, m);
}

function normalizeTime(value: string): string | null {
  const match = value.match(/(\d{1,2})[:.](\d{2})/);
  if (!match) return null;
  return `${match[1].padStart(2, '0')}:${match[2]}`;
}

function lessonToSlot(lesson: LessonEntry): CountdownSlot | null {
  const parts = lesson.time.split('-').map((part) => part.trim());
  if (parts.length < 2) return null;

  const start = normalizeTime(parts[0]);
  const end = normalizeTime(parts[1]);
  if (!start || !end) return null;

  const label = lesson.periodEnd
    ? `${lesson.period}.${lesson.periodEnd}. Stunde`
    : `${lesson.period}. Stunde`;

  return { label, start, end };
}

function formatDuration(mins: number) {
  if (mins < 1) return 'jetzt';
  if (mins < 60) return `${Math.ceil(mins)} Min`;
  const h = Math.floor(mins / 60);
  const m = Math.ceil(mins % 60);
  return m > 0 ? `${h} Std ${m} Min` : `${h} Std`;
}

function formatIn(mins: number) {
  return `in ${formatDuration(mins)}`;
}

function formatSince(mins: number) {
  return `seit ${formatDuration(mins)}`;
}

const berlinTimeFormatter = new Intl.DateTimeFormat('de-DE', {
  timeZone: 'Europe/Berlin',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

const berlinDateFormatter = new Intl.DateTimeFormat('de-DE', {
  timeZone: 'Europe/Berlin',
  weekday: 'long',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

export function Countdown({ lessons = [] }: { lessons?: LessonEntry[] }) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const timeStr = berlinTimeFormatter.format(now);
  const dateStr = berlinDateFormatter.format(now);
  const calendarWeek = getIsoCalendarWeek(now);

  const berlinNow = getBerlinNowParts(now);
  const nowMins = timeToMinutes(berlinNow.hour, berlinNow.minute);
  const weekendNow = checkWeekend(berlinNow.weekdayShort);

  const lessonSlots = lessons
    .map(lessonToSlot)
    .filter((slot): slot is CountdownSlot => slot !== null)
    .sort((a, b) => parseTime(a.start) - parseTime(b.start));
  let countdownText = '';

  if (weekendNow) {
    countdownText = 'Wochenende!';
  } else if (lessonSlots.length === 0) {
    countdownText = 'Heute kein Unterricht';
  } else {
    const slots = lessonSlots;
    const firstStart = parseTime(slots[0].start);
    const lastEnd = parseTime(slots[slots.length - 1].end);

    if (nowMins < firstStart) {
      countdownText = `${slots[0].label} beginnt ${formatIn(firstStart - nowMins)}`;
    } else if (nowMins >= lastEnd) {
      countdownText = `Schulschluss ${formatSince(nowMins - lastEnd)}`;
    } else {
      let found = false;
      for (const [index, slot] of slots.entries()) {
        const nextSlot = slots[index + 1];
        const start = parseTime(slot.start);
        const end = parseTime(slot.end);

        if (nowMins >= start && nowMins < end) {
          const remaining = end - nowMins;
          if (!nextSlot) {
            countdownText = `Schulschluss ${formatIn(remaining)}`;
          } else {
            const nextStart = parseTime(nextSlot.start);
            countdownText = nextStart > end
              ? `Pause beginnt ${formatIn(remaining)}`
              : `${nextSlot.label} beginnt ${formatIn(remaining)}`;
          }
          found = true;
          break;
        }
      }

      if (!found) {
        // In einer Pause
        for (const slot of slots) {
          const start = parseTime(slot.start);
          if (start > nowMins) {
            countdownText = `${slot.label} beginnt ${formatIn(start - nowMins)}`;
            break;
          }
        }
      }
    }
  }

  return (
    <div className="countdown">
      <div className="flex items-center gap-2 mb-2">
        <NetworkDot />
        <span className="text-xs text-muted">{dateStr} · KW {String(calendarWeek).padStart(2, '0')}</span>
      </div>
      <div className="countdown-main">
        <div className="now-time" aria-live="polite">{timeStr}</div>
        {countdownText && (
          <div className="countdown-badge">{countdownText}</div>
        )}
      </div>
    </div>
  );
}
