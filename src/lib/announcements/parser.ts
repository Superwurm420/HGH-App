import { SchoolClass, SpecialEvent } from '@/lib/timetable/types';

export type Announcement = {
  file: string;
  title?: string;
  date?: string;
  audience?: string;
  expires?: string;
  body: string;
  warnings: string[];
};

const DE_DATE = /^\d{2}\.\d{2}\.\d{4} \d{2}:\d{2}$/;
const CLASS_TOKEN = /\b[A-Z]{1,3}\d{2}\b/g;

export function parseAnnouncement(raw: string, file: string): Announcement {
  const [headerRaw, ...bodyParts] = raw.split('\n---\n');
  const body = bodyParts.join('\n---\n').trim();
  const headers: Record<string, string> = {};
  const warnings: string[] = [];

  for (const line of headerRaw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || !trimmed.includes(':')) continue;
    const idx = trimmed.indexOf(':');
    headers[trimmed.slice(0, idx).trim().toLowerCase()] = trimmed.slice(idx + 1).trim();
  }

  if (!headers.title) warnings.push("Pflichtfeld 'title' fehlt.");
  if (!headers.date) warnings.push("Pflichtfeld 'date' fehlt.");
  if (headers.date && !DE_DATE.test(headers.date)) warnings.push("'date' hat nicht das Format TT.MM.JJJJ HH:mm.");
  if (headers.expires && !DE_DATE.test(headers.expires)) warnings.push("'expires' hat nicht das Format TT.MM.JJJJ HH:mm.");
  if (!body) warnings.push('Kein Text nach der Trennlinie gefunden.');

  return {
    file,
    title: headers.title,
    date: headers.date,
    audience: headers.audience,
    expires: headers.expires,
    body,
    warnings,
  };
}

export function parseBerlinDate(value?: string): Date | null {
  if (!value || !DE_DATE.test(value)) return null;
  const [d, t] = value.split(' ');
  const [day, month, year] = d.split('.').map(Number);
  const [hour, minute] = t.split(':').map(Number);
  return new Date(`${year.toString().padStart(4, '0')}-${month.toString().padStart(2, '0')}-${day
    .toString()
    .padStart(2, '0')}T${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:00+01:00`);
}

export function isActive(item: Announcement, now: Date = new Date()): boolean {
  const expires = parseBerlinDate(item.expires);
  if (!expires) return true;
  return expires.getTime() >= now.getTime();
}

export function toSpecialEvent(item: Announcement): SpecialEvent | null {
  if (!item.title || !item.date) return null;

  const classes = extractClasses(item.audience);
  return {
    id: item.file,
    title: item.title,
    audience: item.audience,
    startsAt: item.date,
    endsAt: item.expires,
    details: item.body,
    classes,
  };
}

function extractClasses(audience?: string): SchoolClass[] | 'alle' {
  if (!audience || audience.toLowerCase() === 'alle') return 'alle';
  const matches = audience.toUpperCase().match(CLASS_TOKEN) ?? [];
  const classes = [...new Set(matches)];
  return classes.length > 0 ? classes : 'alle';
}
