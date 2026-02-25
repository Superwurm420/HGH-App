'use client';

import { useEffect, useState } from 'react';
import { ExpiryCountdown } from './ExpiryCountdown';

type AnnouncementItemProps = {
  file: string;
  title?: string;
  date?: string;
  audience?: string;
  expires?: string;
  body: string;
  warnings: string[];
};

const DE_DATE = /^(\d{2})\.(\d{2})\.(\d{4}) (\d{2}):(\d{2})$/;

function parseBerlinDateClient(value: string): Date | null {
  const m = value.match(DE_DATE);
  if (!m) return null;
  const [, dd, mm, yyyy, hh, min] = m;
  const approxOffset = new Date().getTimezoneOffset() === -120 ? '+02:00' : '+01:00';
  return new Date(`${yyyy}-${mm}-${dd}T${hh}:${min}:00${approxOffset}`);
}

export function AnnouncementItem({ file, title, date, audience, expires, body, warnings }: AnnouncementItemProps) {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    if (!expires) return;
    const target = parseBerlinDateClient(expires);
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
    <article key={file} className="announcement-card">
      <div className="flex items-start justify-between gap-2 mb-1">
        <h3 className="text-sm font-bold">{title ?? 'Ohne Titel'}</h3>
        {date && <span className="text-xs text-muted whitespace-nowrap">{date}</span>}
      </div>

      {audience && (
        <p className="text-xs text-muted mb-1">Zielgruppe: {audience}</p>
      )}

      <p className="text-sm whitespace-pre-wrap">{body || 'Kein Text hinterlegt.'}</p>

      {expires && (
        <div className="flex items-center gap-2 mt-2">
          <span className="text-xs text-muted">Gültig bis {expires}</span>
          <ExpiryCountdown expires={expires} />
        </div>
      )}

      {warnings.length > 0 && (
        <div className="announcement-card highlight mt-2 text-xs">
          {warnings.join(' ')}
        </div>
      )}
    </article>
  );
}
