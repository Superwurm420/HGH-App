'use client';

const CLASS_KEY = 'hgh:selected-class';
const THEME_KEY = 'hgh:theme';
const CACHE_KEY = 'hgh:last-data';

export type ThemeMode = 'light' | 'dark' | 'system';

export function saveSelectedClass(value: string) {
  localStorage.setItem(CLASS_KEY, value);
}

export function loadSelectedClass(): string | null {
  return localStorage.getItem(CLASS_KEY);
}

export function saveTheme(mode: ThemeMode) {
  localStorage.setItem(THEME_KEY, mode);
}

export function loadTheme(): ThemeMode {
  return (localStorage.getItem(THEME_KEY) as ThemeMode | null) ?? 'system';
}

export function saveLastData(data: unknown) {
  localStorage.setItem(CACHE_KEY, JSON.stringify({ at: new Date().toISOString(), data }));
}

export function loadLastData<T>(): { at: string; data: T } | null {
  const raw = localStorage.getItem(CACHE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as { at: string; data: T };
  } catch {
    return null;
  }
}
