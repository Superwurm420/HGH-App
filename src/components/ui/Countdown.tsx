'use client';

import { useEffect, useState } from 'react';
import { NetworkDot } from './NetworkDot';

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

function timeToMinutes(h: number, m: number) {
  return h * 60 + m;
}

function parseTime(s: string) {
  const [h, m] = s.split(':').map(Number);
  return timeToMinutes(h, m);
}

function formatDuration(mins: number) {
  if (mins < 1) return 'jetzt';
  if (mins < 60) return `${Math.ceil(mins)} Min`;
  const h = Math.floor(mins / 60);
  const m = Math.ceil(mins % 60);
  return m > 0 ? `${h} Std ${m} Min` : `${h} Std`;
}

const FUN_MESSAGES = [
  'Kopf hoch, bald ist Pause!',
  'Durchhalten lohnt sich.',
  'Bildung ist eine Investition.',
  'Nur noch ein paar Stunden...',
  'Du schaffst das!',
];

export function Countdown() {
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

  let countdownText = '';
  let funMsg = '';

  if (isWeekend) {
    countdownText = 'Wochenende!';
    funMsg = 'Genieß die freie Zeit.';
  } else if (nowMins < parseTime(SCHEDULE[0].start)) {
    const diff = parseTime(SCHEDULE[0].start) - nowMins;
    countdownText = `Schulbeginn in ${formatDuration(diff)}`;
    funMsg = 'Guten Morgen!';
  } else if (nowMins >= parseTime(SCHEDULE[SCHEDULE.length - 1].end)) {
    countdownText = 'Schulschluss!';
    funMsg = 'Feierabend, gut gemacht!';
  } else {
    // Find current or next period
    let found = false;
    for (const slot of SCHEDULE) {
      const start = parseTime(slot.start);
      const end = parseTime(slot.end);
      if (nowMins >= start && nowMins < end) {
        const remaining = end - nowMins;
        countdownText = `${slot.period}. Stunde endet in ${formatDuration(remaining)}`;
        funMsg = FUN_MESSAGES[slot.period % FUN_MESSAGES.length];
        found = true;
        break;
      }
    }
    if (!found) {
      // In a break
      for (const slot of SCHEDULE) {
        const start = parseTime(slot.start);
        if (start > nowMins) {
          const diff = start - nowMins;
          countdownText = `${slot.period}. Stunde beginnt in ${formatDuration(diff)}`;
          funMsg = 'Pausenzeit!';
          break;
        }
      }
    }
  }

  return (
    <div className="countdown">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <NetworkDot />
            <span className="text-xs text-muted">{dateStr}</span>
          </div>
          <div className="now-time" aria-live="polite">{timeStr}</div>
        </div>
        {countdownText && (
          <div className="countdown-badge">{countdownText}</div>
        )}
      </div>
      {funMsg && (
        <div className="fun-message" aria-live="polite">{funMsg}</div>
      )}
    </div>
  );
}
