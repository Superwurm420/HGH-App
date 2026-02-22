import { Weekday } from './types';

export function weekdayForToday(now = new Date()): Weekday {
  const idx = now.getDay();
  if (idx === 1) return 'MO';
  if (idx === 2) return 'DI';
  if (idx === 3) return 'MI';
  if (idx === 4) return 'DO';
  return 'FR';
}
