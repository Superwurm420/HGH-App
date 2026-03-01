'use client';

import { useEffect, useState } from 'react';
import { NetworkDot } from './NetworkDot';
import { LessonEntry } from '@/lib/timetable/types';


type CountdownSlot = {
  label: string;
  start: string;
  end: string;
};

function timeToMinutes(h: number, m: number) {
  return h * 60 + m;
}

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

const berlinCalendarWeekFormatter = new Intl.DateTimeFormat('de-DE', {
  timeZone: 'Europe/Berlin',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

const berlinWeekdayFormatter = new Intl.DateTimeFormat('de-DE', {
  timeZone: 'Europe/Berlin',
  weekday: 'short',
});

function getIsoCalendarWeek(date: Date) {
  const parts = berlinCalendarWeekFormatter.formatToParts(date);

  const day = Number(parts.find((part) => part.type === 'day')?.value ?? 1);
  const month = Number(parts.find((part) => part.type === 'month')?.value ?? 1);
  const year = Number(parts.find((part) => part.type === 'year')?.value ?? 1970);

  const utcDate = new Date(Date.UTC(year, month - 1, day));
  const weekday = utcDate.getUTCDay() || 7;
  utcDate.setUTCDate(utcDate.getUTCDate() + 4 - weekday);

  const yearStart = new Date(Date.UTC(utcDate.getUTCFullYear(), 0, 1));
  return Math.ceil((((utcDate.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

export function Countdown({ lessons = [] }: { lessons?: LessonEntry[] }) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const timeStr = berlinTimeFormatter.format(now);
  const dateStr = berlinDateFormatter.format(now);
  const calendarWeek = getIsoCalendarWeek(now);

  // Get Berlin-local hours/minutes for countdown calculation
  const berlinParts = berlinTimeFormatter.formatToParts(now);
  const berlinH = Number(berlinParts.find(p => p.type === 'hour')?.value ?? 0);
  const berlinM = Number(berlinParts.find(p => p.type === 'minute')?.value ?? 0);
  const nowMins = timeToMinutes(berlinH, berlinM);

  // Use Berlin timezone for the weekend check (consistent with Berlin hours above)
  const berlinDayParts = berlinWeekdayFormatter.formatToParts(now);
  const berlinDayStr = berlinDayParts.find((p) => p.type === 'weekday')?.value ?? '';
  const isWeekend = berlinDayStr.startsWith('Sa') || berlinDayStr.startsWith('So');
  const lessonSlots = lessons
    .map(lessonToSlot)
    .filter((slot): slot is CountdownSlot => slot !== null)
    .sort((a, b) => parseTime(a.start) - parseTime(b.start));
  let countdownText = '';

  if (isWeekend) {
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
