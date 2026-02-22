'use client';

import { useEffect, useState } from 'react';

export function StatusHint({ lastUpdated }: { lastUpdated: string | null }) {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const set = () => setOnline(navigator.onLine);
    set();
    window.addEventListener('online', set);
    window.addEventListener('offline', set);
    return () => {
      window.removeEventListener('online', set);
      window.removeEventListener('offline', set);
    };
  }, []);

  return (
    <p className="text-xs text-slate-500 dark:text-slate-400">
      Status: {online ? 'online' : 'offline'} · Letzter Stundenplan: {lastUpdated ?? 'unbekannt'}
    </p>
  );
}
