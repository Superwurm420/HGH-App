'use client';

import { useEffect, useState } from 'react';
import { NetworkDot } from './NetworkDot';
import { LessonEntry } from '@/lib/timetable/types';
import { parseLessonTimeRange } from '@/lib/timetable/lesson-times';
import {
  getBerlinNowParts,
  getIsoCalendarWeek,
  timeToMinutes,
  isWeekend as checkWeekend,
} from '@/lib/berlin-time';


type CountdownSlot = {
  label: string;
  start: number;
  end: number;
};

function lessonToSlot(lesson: LessonEntry): CountdownSlot | null {
  const range = parseLessonTimeRange(lesson.time);
  if (!range) return null;

  const label = lesson.periodEnd
    ? `${lesson.period}.${lesson.periodEnd}. Stunde`
    : `${lesson.period}. Stunde`;

  return { label, start: range.start, end: range.end };
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
    .sort((a, b) => a.start - b.start);
  let countdownText = '';

  if (weekendNow) {
    countdownText = 'Wochenende!';
  } else if (lessonSlots.length === 0) {
    countdownText = 'Heute kein Unterricht';
  } else {
    const slots = lessonSlots;
    const firstStart = slots[0].start;
    const lastEnd = slots[slots.length - 1].end;

    if (nowMins < firstStart) {
      countdownText = `${slots[0].label} beginnt ${formatIn(firstStart - nowMins)}`;
    } else if (nowMins >= lastEnd) {
      countdownText = `Schulschluss ${formatSince(nowMins - lastEnd)}`;
    } else {
      let found = false;
      for (const [index, slot] of slots.entries()) {
        const nextSlot = slots[index + 1];
        const { start, end } = slot;

        if (nowMins >= start && nowMins < end) {
          const remaining = end - nowMins;
          if (!nextSlot) {
            countdownText = `Schulschluss ${formatIn(remaining)}`;
          } else {
            const nextStart = nextSlot.start;
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
          if (slot.start > nowMins) {
            countdownText = `${slot.label} beginnt ${formatIn(slot.start - nowMins)}`;
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
        {/* Kein aria-live: Die Uhr läuft sekündlich — ein Screenreader würde
            sonst im Sekundentakt die Uhrzeit vorlesen. */}
        <div className="now-time">{timeStr}</div>
        {countdownText && (
          <div className="countdown-badge">{countdownText}</div>
        )}
      </div>
    </div>
  );
}
