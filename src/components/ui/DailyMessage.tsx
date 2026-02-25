'use client';

import { useEffect, useState } from 'react';

type MessagesData = {
  morgen?: string[];
  mittag?: string[];
  nachmittag?: string[];
  schulschluss?: string[];
  wochenende?: string[];
  klassen?: Record<string, string[]>;
  [key: string]: unknown;
};

function getBerlinHour(): number {
  const parts = new Intl.DateTimeFormat('de-DE', {
    timeZone: 'Europe/Berlin',
    hour: '2-digit',
    hour12: false,
  }).formatToParts(new Date());
  return Number(parts.find((p) => p.type === 'hour')?.value ?? 0);
}

function getTimeCategory(hour: number, isWeekend: boolean): string {
  if (isWeekend) return 'wochenende';
  if (hour < 10) return 'morgen';
  if (hour < 13) return 'mittag';
  if (hour < 17) return 'nachmittag';
  return 'schulschluss';
}

function pickMessage(pool: string[]): string {
  if (pool.length === 0) return '';
  // Gleiche Meldung den ganzen Tag – wechselt täglich
  const dayOfYear = Math.floor(Date.now() / (1000 * 60 * 60 * 24));
  return pool[dayOfYear % pool.length];
}

export function DailyMessage({
  messages,
  schoolClass,
}: {
  messages: MessagesData;
  schoolClass?: string;
}) {
  const [text, setText] = useState('');

  useEffect(() => {
    const now = new Date();
    const isWeekend = now.getDay() === 0 || now.getDay() === 6;
    const hour = getBerlinHour();
    const category = getTimeCategory(hour, isWeekend);

    const general: string[] = (messages[category] as string[] | undefined) ?? [];
    const klassenSpecific: string[] =
      schoolClass && messages.klassen?.[schoolClass]
        ? messages.klassen[schoolClass]
        : [];

    // Mix general und klassenspezifisch – Klasse hat etwas häufiger Vorrang
    const pool: string[] =
      klassenSpecific.length > 0
        ? [...general, ...klassenSpecific, ...klassenSpecific]
        : general;

    setText(pickMessage(pool));
  }, [messages, schoolClass]);

  if (!text) return null;

  return (
    <div className="daily-message">
      <p className="daily-message-text">{text}</p>
    </div>
  );
}
