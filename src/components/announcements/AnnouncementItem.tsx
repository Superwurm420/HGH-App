'use client';

import { useEffect, useMemo, useState } from 'react';
import { parseBerlinDate } from '@/lib/announcements/parser';
import { ExpiryCountdown } from './ExpiryCountdown';
import styles from './AnnouncementItem.module.css';

type AnnouncementItemProps = {
  id: string;
  title: string;
  date: string;
  expires?: string;
  body: string;
};

export function AnnouncementItem({ id, title, date, expires, body }: AnnouncementItemProps) {
  const [nowTs, setNowTs] = useState(() => Date.now());

  const expiresAt = useMemo(() => {
    if (!expires) return null;
    return parseBerlinDate(expires);
  }, [expires]);

  useEffect(() => {
    if (!expiresAt) return;
    const remaining = expiresAt.getTime() - Date.now();
    if (remaining <= 0) return;
    const timeout = setTimeout(() => setNowTs(Date.now()), remaining);
    return () => clearTimeout(timeout);
  }, [expiresAt]);

  const isHidden = Boolean(expiresAt && expiresAt.getTime() <= nowTs);
  if (isHidden) return null;

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
