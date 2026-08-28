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

export function saveTheme(mode: ThemeMode) {
  if (!hasStorage()) return;
  localStorage.setItem(THEME_KEY, mode);
}

export function loadTheme(): ThemeMode {
  if (!hasStorage()) return 'system';
  return (localStorage.getItem(THEME_KEY) as ThemeMode | null) ?? 'system';
}
