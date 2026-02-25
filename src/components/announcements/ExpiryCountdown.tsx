'use client';

import { useEffect, useState } from 'react';
import { parseBerlinDate } from '@/lib/announcements/parser';

function formatRemaining(seconds: number): string {
  if (seconds <= 0) return 'abgelaufen';
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d} Tag${d !== 1 ? 'e' : ''}`;
  if (h > 0) return `${h} Std ${m} Min`;
  return `${m} Min`;
}

export function ExpiryCountdown({ expires }: { expires: string }) {
  const getRemaining = () => {
    const target = parseBerlinDate(expires);
    if (!target) return null;
    return Math.floor((target.getTime() - Date.now()) / 1000);
  };

  const [remaining, setRemaining] = useState<number | null>(getRemaining);

  useEffect(() => {
    const id = setInterval(() => setRemaining(getRemaining()), 60_000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expires]);

  if (remaining === null) return null;

  const isExpired = remaining <= 0;
  const urgency = remaining < 3600; // weniger als 1 Stunde

  return (
    <span
      className={`expiry-countdown ${isExpired ? 'expired' : ''} ${urgency && !isExpired ? 'urgent' : ''}`}
    >
      {isExpired ? 'abgelaufen' : `endet in ${formatRemaining(remaining)}`}
    </span>
  );
}
