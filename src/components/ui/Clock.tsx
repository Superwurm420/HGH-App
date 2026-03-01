'use client';

import { useEffect, useState } from 'react';

type ClockProps = {
  variant?: 'default' | 'tv';
};

const tvTimeFormatter = new Intl.DateTimeFormat('de-DE', {
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'Europe/Berlin',
});

const tvDateFormatter = new Intl.DateTimeFormat('de-DE', {
  weekday: 'long',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  timeZone: 'Europe/Berlin',
});

const defaultFormatter = new Intl.DateTimeFormat('de-DE', {
  weekday: 'long',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'Europe/Berlin',
});

export function Clock({ variant = 'default' }: ClockProps) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  if (variant === 'tv') {
    return (
      <div className="tv-clock" aria-live="polite">
        <p className="tv-clock-time">
          {tvTimeFormatter.format(now)}
        </p>
        <p className="tv-clock-date text-muted">
          {tvDateFormatter.format(now)}
        </p>
      </div>
    );
  }

  return (
    <p className="text-xl font-semibold" aria-live="polite">
      {defaultFormatter.format(now)}
    </p>
  );
}
