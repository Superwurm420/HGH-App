'use client';

import { CLASS_COOKIE } from '@/lib/timetable/select-class';

const CLASS_KEY = 'hgh:selected-class';
const THEME_KEY = 'hgh:theme';
const TIMETABLE_VERSION_KEY = 'hgh:timetable-version';

export type ThemeMode = 'light' | 'dark' | 'system';

function hasStorage(): boolean {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
}

/**
 * Die Klasse wird doppelt gespeichert: im lokalen Speicher für den Browser und
 * als Cookie, damit der Server schon beim ersten Rendern die richtige Klasse
 * kennt (siehe `CLASS_COOKIE`). Ein Jahr Laufzeit, `Lax` reicht — die Auswahl
 * ist keine Anmeldung.
 */
export function saveSelectedClass(value: string) {
  if (!hasStorage()) return;
  localStorage.setItem(CLASS_KEY, value);
  writeClassCookie(value);
}

function writeClassCookie(value: string) {
  if (typeof document === 'undefined') return;
  document.cookie = `${CLASS_COOKIE}=${encodeURIComponent(value)}; path=/; max-age=31536000; samesite=lax`;
}

/**
 * Trägt eine bereits gespeicherte Klasse ins Cookie nach. Geräte, die die App
 * schon vor dem Cookie benutzt haben, hätten sonst weiterhin den kurzen
 * Fehlrender beim ersten Aufruf.
 */
export function syncSelectedClassCookie(value: string) {
  writeClassCookie(value);
}

export function loadSelectedClass(): string | null {
  if (!hasStorage()) return null;
  return localStorage.getItem(CLASS_KEY);
}

// Der zuletzt gesehene Stundenplan-Stempel. Er liegt im Speicher und nicht nur
// im Arbeitsspeicher, damit der Hinweis auch beim Start der App erscheint, wenn
// der Plan zwischen zwei Besuchen gewechselt hat.
export function saveSeenTimetableVersion(value: string) {
  if (!hasStorage()) return;
  localStorage.setItem(TIMETABLE_VERSION_KEY, value);
}

export function loadSeenTimetableVersion(): string | null {
  if (!hasStorage()) return null;
  return localStorage.getItem(TIMETABLE_VERSION_KEY);
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
