'use client';

import { useEffect, useState } from 'react';
import { loadTheme, saveTheme, ThemeMode } from '@/lib/storage/preferences';

const LABELS: Record<ThemeMode, string> = {
  light: 'Hell',
  dark: 'Dunkel',
  system: 'System',
};

export function ThemeToggle() {
  const [mode, setMode] = useState<ThemeMode>('system');

  useEffect(() => {
    setMode(loadTheme());
  }, []);

  useEffect(() => {
    const isDark = mode === 'dark' || (mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.classList.toggle('dark', isDark);
    saveTheme(mode);
  }, [mode]);

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-slate-500 dark:text-slate-400">Design:</span>
      {(Object.keys(LABELS) as ThemeMode[]).map((key) => (
        <button
          key={key}
          className={`btn-secondary ${mode === key ? 'ring-2 ring-primary' : ''}`}
          onClick={() => setMode(key)}
          type="button"
        >
          {LABELS[key]}
        </button>
      ))}
    </div>
  );
}
