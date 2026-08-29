'use client';

const CLASS_KEY = 'hgh:selected-class';
const THEME_KEY = 'hgh:theme';

export type ThemeMode = 'light' | 'dark' | 'system';

function hasStorage(): boolean {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
}

export function saveSelectedClass(value: string) {
  if (!hasStorage()) return;
  localStorage.setItem(CLASS_KEY, value);
}

export function loadSelectedClass(): string | null {
  if (!hasStorage()) return null;
  return localStorage.getItem(CLASS_KEY);
}

// Das Farbschema wird an mehreren Stellen gelesen (Umschalter, TV-Ansicht) und
// kann sich in einem anderen Tab ändern. Deshalb ist der Speicher hier ein
// kleiner Ereignis-Verteiler: React kann ihn über useSyncExternalStore
// abonnieren, statt den Wert in einem Effekt nachzuladen.
const themeListeners = new Set<() => void>();

export function subscribeTheme(listener: () => void): () => void {
  themeListeners.add(listener);
  if (typeof window !== 'undefined') {
    window.addEventListener('storage', listener);
  }

  return () => {
    themeListeners.delete(listener);
    if (typeof window !== 'undefined') {
      window.removeEventListener('storage', listener);
    }
  };
}

export function saveTheme(mode: ThemeMode) {
  if (!hasStorage()) return;
  localStorage.setItem(THEME_KEY, mode);
  for (const listener of themeListeners) listener();
}

export function loadTheme(): ThemeMode {
  if (!hasStorage()) return 'system';
  const stored = localStorage.getItem(THEME_KEY);
  return stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'system';
}

/** Auf dem Server ist nichts gespeichert — dort gilt die Systemeinstellung. */
export function serverTheme(): ThemeMode {
  return 'system';
}
