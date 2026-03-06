'use client';

import { useEffect, useState } from 'react';
import { ExpiryCountdown } from './ExpiryCountdown';
import styles from './AnnouncementItem.module.css';

type AnnouncementItemProps = {
  id: string;
  title: string;
  date: string;
  expires?: string;
  body: string;
};

function parseDateString(dateStr: string): Date | null {
  // Versuche deutsches Format DD.MM.YYYY HH:mm
  const deMatch = dateStr.match(/^(\d{2})\.(\d{2})\.(\d{4})\s+(\d{2}):(\d{2})$/);
  if (deMatch) {
    const [, day, month, year, hour, minute] = deMatch;
    return new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute));
  }
  // Fallback: ISO format
  const iso = new Date(dateStr);
  return Number.isNaN(iso.getTime()) ? null : iso;
}

export function AnnouncementItem({ id, title, date, expires, body }: AnnouncementItemProps) {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    if (!expires) return;
    const target = parseDateString(expires);
    if (!target) return;
    const remaining = target.getTime() - Date.now();
    if (remaining <= 0) {
      setHidden(true);
      return;
    }
    const timeout = setTimeout(() => setHidden(true), remaining);
    return () => clearTimeout(timeout);
  }, [expires]);

  if (hidden) return null;

  return (
    <article key={id} className={styles.card}>
      <div className="flex items-start justify-between gap-2 mb-1">
        <h3 className="text-sm font-bold">{title || 'Ohne Titel'}</h3>
        {date && <span className="text-xs text-muted whitespace-nowrap">{date}</span>}
      </div>

      <p className="text-sm whitespace-pre-wrap">{body || 'Kein Text hinterlegt.'}</p>

      {expires && (
        <div className="flex items-center gap-2 mt-2">
          <span className="text-xs text-muted">Gültig bis {expires}</span>
          <ExpiryCountdown expires={expires} />
        </div>
      )}
    </article>
  );
}
