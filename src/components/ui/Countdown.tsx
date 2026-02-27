'use client';

import { useEffect, useState } from 'react';
import { NetworkDot } from './NetworkDot';
import { LessonEntry } from '@/lib/timetable/types';

const SCHEDULE = [
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
];

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

export function Countdown({ lessons = [] }: { lessons?: LessonEntry[] }) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const berlinFormatter = new Intl.DateTimeFormat('de-DE', {
    timeZone: 'Europe/Berlin',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const dateFormatter = new Intl.DateTimeFormat('de-DE', {
    timeZone: 'Europe/Berlin',
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  const timeStr = berlinFormatter.format(now);
  const dateStr = dateFormatter.format(now);

  // Get Berlin-local hours/minutes for countdown calculation
  const berlinParts = new Intl.DateTimeFormat('de-DE', {
    timeZone: 'Europe/Berlin',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(now);
  const berlinH = Number(berlinParts.find(p => p.type === 'hour')?.value ?? 0);
  const berlinM = Number(berlinParts.find(p => p.type === 'minute')?.value ?? 0);
  const nowMins = timeToMinutes(berlinH, berlinM);

  // Use Berlin timezone for the weekend check (consistent with Berlin hours above)
  const berlinDayParts = new Intl.DateTimeFormat('de-DE', {
    timeZone: 'Europe/Berlin',
    weekday: 'short',
  }).formatToParts(now);
  const berlinDayStr = berlinDayParts.find((p) => p.type === 'weekday')?.value ?? '';
  const isWeekend = berlinDayStr.startsWith('Sa') || berlinDayStr.startsWith('So');
  const lessonSlots = lessons
    .map(lessonToSlot)
    .filter((slot): slot is CountdownSlot => slot !== null)
    .sort((a, b) => parseTime(a.start) - parseTime(b.start));
  const slots = lessonSlots.length > 0
    ? lessonSlots
    : SCHEDULE.map((slot) => ({ label: `${slot.period}. Stunde`, start: slot.start, end: slot.end }));

  let countdownText = '';

  if (isWeekend) {
    countdownText = 'Wochenende!';
  } else if (lessonSlots.length === 0 && lessons.length > 0) {
    countdownText = 'Heute kein Unterricht';
  } else if (nowMins < parseTime(slots[0].start)) {
    const diff = parseTime(slots[0].start) - nowMins;
    countdownText = `Unterrichtsbeginn in ${formatDuration(diff)}`;
  } else if (nowMins >= parseTime(slots[slots.length - 1].end)) {
    countdownText = 'Schulschluss!';
  } else {
    // Find current or next period
    let found = false;
    for (const slot of slots) {
      const start = parseTime(slot.start);
      const end = parseTime(slot.end);
      if (nowMins >= start && nowMins < end) {
        const remaining = end - nowMins;
        countdownText = `${slot.label} endet in ${formatDuration(remaining)}`;
        found = true;
        break;
      }
    }
    if (!found) {
      // In a break
      for (const slot of slots) {
        const start = parseTime(slot.start);
        if (start > nowMins) {
          const diff = start - nowMins;
          countdownText = `${slot.label} beginnt in ${formatDuration(diff)}`;
          break;
        }
      }
    }
  }

  return (
    <div className="countdown">
      <div className="flex items-center gap-2 mb-2">
        <NetworkDot />
        <span className="text-xs text-muted">{dateStr}</span>
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
