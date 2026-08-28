'use client';

import { useEffect, useState } from 'react';

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

/**
 * Uhr für den Wandbildschirm.
 *
 * Angezeigt werden nur Stunde und Minute, deshalb genügt ein Takt von 15 s.
 * Sekündlich neu zu rendern hieße im Dauerbetrieb 86.400 Renderdurchläufe pro
 * Tag für eine Anzeige, die sich 1.440-mal ändert.
 */
export function Clock() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 15_000);
    return () => window.clearInterval(timer);
  }, []);

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
