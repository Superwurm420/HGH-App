'use client';

const CLASS_KEY = 'hgh:selected-class';
const THEME_KEY = 'hgh:theme';
const CACHE_KEY = 'hgh:last-data';

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

export function saveTheme(mode: ThemeMode) {
  if (!hasStorage()) return;
  localStorage.setItem(THEME_KEY, mode);
}

export function loadTheme(): ThemeMode {
  if (!hasStorage()) return 'system';
  return (localStorage.getItem(THEME_KEY) as ThemeMode | null) ?? 'system';
}

export function saveLastData(data: unknown) {
  if (!hasStorage()) return;
  localStorage.setItem(CACHE_KEY, JSON.stringify({ at: new Date().toISOString(), data }));
}

export function loadLastData<T>(): { at: string; data: T } | null {
  if (!hasStorage()) return null;
  const raw = localStorage.getItem(CACHE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as { at: string; data: T };
  } catch {
    return null;
  }
}
