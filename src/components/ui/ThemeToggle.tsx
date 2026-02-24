'use client';

import { useEffect, useState } from 'react';
import { loadTheme, saveTheme, ThemeMode } from '@/lib/storage/preferences';

export function ThemeToggle() {
  const [mode, setMode] = useState<ThemeMode>('system');

  useEffect(() => {
    setMode(loadTheme());
  }, []);

  useEffect(() => {
    const isDark = mode === 'dark' || (mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.classList.toggle('light', !isDark);
    saveTheme(mode);
  }, [mode]);

  const next = (): ThemeMode => {
    if (mode === 'system') return 'light';
    if (mode === 'light') return 'dark';
    return 'system';
  };

  const icon = mode === 'light' ? '\u2600' : mode === 'dark' ? '\u263E' : '\u25D0';

  return (
    <button
      className="icon-btn"
      onClick={() => setMode(next())}
      type="button"
      aria-label="Farbschema umschalten"
      title={`Aktuell: ${mode === 'light' ? 'Hell' : mode === 'dark' ? 'Dunkel' : 'System'}`}
    >
      <span className="text-lg" aria-hidden="true">{icon}</span>
    </button>
  );
}
