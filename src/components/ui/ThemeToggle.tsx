'use client';

import { useEffect, useSyncExternalStore } from 'react';
import { loadTheme, saveTheme, serverTheme, subscribeTheme, ThemeMode } from '@/lib/storage/preferences';

const LABELS: Record<ThemeMode, string> = {
  system: 'System',
  light: 'Hell',
  dark: 'Dunkel',
};

const ICONS: Record<ThemeMode, string> = {
  system: '◐',
  light: '☀',
  dark: '☾',
};

const NEXT_MODE: Record<ThemeMode, ThemeMode> = {
  system: 'light',
  light: 'dark',
  dark: 'system',
};

export function ThemeToggle() {
  // Der Server kennt die gespeicherte Einstellung nicht. Über
  // useSyncExternalStore liefert der erste Aufbau denselben Wert wie das HTML
  // vom Server ('system') und React zieht direkt danach den echten nach —
  // ein Lesen aus dem localStorage schon beim Rendern wäre ein
  // Hydration-Fehler. Das Farbschema selbst setzt ThemeScript ohnehin vor dem
  // ersten Bild.
  const mode = useSyncExternalStore(subscribeTheme, loadTheme, serverTheme);

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');

    const apply = () => {
      const isDark = mode === 'dark' || (mode === 'system' && media.matches);
      document.documentElement.classList.toggle('light', !isDark);
    };

    apply();

    // Solange nichts anderes gewählt ist, folgt die App der Systemeinstellung
    // auch dann, wenn sie sich bei geöffneter App ändert.
    if (mode !== 'system') return;
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [mode]);

  return (
    <button
      className="icon-btn"
      onClick={() => saveTheme(NEXT_MODE[mode])}
      type="button"
      aria-label={`Farbschema umschalten, aktuell: ${LABELS[mode]}`}
      title={`Aktuell: ${LABELS[mode]}`}
    >
      <span className="text-lg" aria-hidden="true">{ICONS[mode]}</span>
    </button>
  );
}
