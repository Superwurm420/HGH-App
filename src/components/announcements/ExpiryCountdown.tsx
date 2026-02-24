'use client';

import { useEffect, useState } from 'react';

const DE_DATE = /^(\d{2})\.(\d{2})\.(\d{4}) (\d{2}):(\d{2})$/;

function parseBerlinDate(value: string): Date | null {
  const m = value.match(DE_DATE);
  if (!m) return null;
  const [, dd, mm, yyyy, hh, min] = m;
  // Approximation: Berliner Zeit (ohne automatische Sommer-/Winterzeit-Erkennung)
  // Für korrekte Zeitzone wird der Offset laut aktueller Jahreszeit gesetzt
  const approxOffset = new Date().getTimezoneOffset() === -120 ? '+02:00' : '+01:00';
  return new Date(`${yyyy}-${mm}-${dd}T${hh}:${min}:00${approxOffset}`);
}

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
