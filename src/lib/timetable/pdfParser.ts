import { Weekday } from './types';

export function weekdayForToday(now = new Date()): Weekday {
  // Use Berlin timezone so server-side rendering returns the correct day
  // regardless of the server's UTC offset (e.g. midnight CET = 23:00 UTC).
  const parts = new Intl.DateTimeFormat('de-DE', {
    timeZone: 'Europe/Berlin',
    weekday: 'short',
  }).formatToParts(now);
  const day = parts.find((p) => p.type === 'weekday')?.value ?? '';
  // German short weekday values: 'Mo.', 'Di.', 'Mi.', 'Do.', 'Fr.', 'Sa.', 'So.'
  if (day.startsWith('Mo')) return 'MO';
  if (day.startsWith('Di')) return 'DI';
  if (day.startsWith('Mi')) return 'MI';
  if (day.startsWith('Do')) return 'DO';
  if (day.startsWith('Fr')) return 'FR';
  return 'MO'; // Sa., So. → am Wochenende bereits den Montag zeigen
}
