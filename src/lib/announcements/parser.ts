import { SchoolClass, SpecialEvent } from '@/lib/timetable/types';

export type Announcement = {
  file: string;
  title?: string;
  date?: string;
  audience?: string;
  expires?: string;
  highlight: boolean;
  body: string;
  warnings: string[];
};

const DE_DATE = /^\d{2}\.\d{2}\.\d{4} \d{2}:\d{2}$/;
const CLASS_TOKEN = /\b[A-Z]{1,3}\d{2}\b/g;
const COMMENT_PREFIXES = ['#', '//', ';'];

function isCommentLine(line: string): boolean {
  return COMMENT_PREFIXES.some((prefix) => line.startsWith(prefix));
}

function parseBooleanFlag(value?: string): boolean | null {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  if (['true', '1', 'ja', 'yes', 'y'].includes(normalized)) return true;
  if (['false', '0', 'nein', 'no', 'n'].includes(normalized)) return false;
  return null;
}

export function parseAnnouncement(raw: string, file: string): Announcement {
  const [headerRaw, ...bodyParts] = raw.split('\n---\n');
  const body = bodyParts.join('\n---\n').trim();
  const headers: Record<string, string> = {};
  const warnings: string[] = [];

  for (const line of headerRaw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || isCommentLine(trimmed) || !trimmed.includes(':')) continue;
    const idx = trimmed.indexOf(':');
    headers[trimmed.slice(0, idx).trim().toLowerCase()] = trimmed.slice(idx + 1).trim();
  }

  const highlight = parseBooleanFlag(headers.highlight);

  if (!headers.title) warnings.push("Pflichtfeld 'title' fehlt.");
  if (!headers.date) warnings.push("Pflichtfeld 'date' fehlt.");
  if (headers.date && !DE_DATE.test(headers.date)) warnings.push("'date' hat nicht das Format TT.MM.JJJJ HH:mm.");
  if (headers.expires && !DE_DATE.test(headers.expires)) warnings.push("'expires' hat nicht das Format TT.MM.JJJJ HH:mm.");
  if (highlight === null) warnings.push("'highlight' muss true/false, ja/nein oder 1/0 sein.");
  if (!body) warnings.push('Kein Text nach der Trennlinie gefunden.');

  return {
    file,
    title: headers.title,
    date: headers.date,
    audience: headers.audience,
    expires: headers.expires,
    highlight: highlight ?? false,
    body,
    warnings,
  };
}

export function parseBerlinDate(value?: string): Date | null {
  if (!value || !DE_DATE.test(value)) return null;
  const [d, t] = value.split(' ');
  const [day, month, year] = d.split('.').map(Number);
  const [hour, minute] = t.split(':').map(Number);
  // Determine Berlin UTC offset (CET = +1, CEST = +2) using Intl
  const noonUtc = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  const berlinNoonHour = parseInt(
    new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Berlin', hour: '2-digit', hour12: false })
      .formatToParts(noonUtc)
      .find((p) => p.type === 'hour')?.value ?? '13',
    10,
  );
  const offsetHours = berlinNoonHour - 12; // +1 (CET) or +2 (CEST)
  return new Date(Date.UTC(year, month - 1, day, hour - offsetHours, minute));
}

export function isActive(item: Announcement, now: Date = new Date()): boolean {
  const expires = parseBerlinDate(item.expires);
  if (!expires) return true;
  return expires.getTime() >= now.getTime();
}

export function toSpecialEvent(item: Announcement): SpecialEvent | null {
  if (!item.highlight || !item.title || !item.date) return null;

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
