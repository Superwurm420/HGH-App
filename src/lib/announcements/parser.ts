import { SchoolClass, SpecialEvent } from '@/lib/timetable/types';

export type Announcement = {
  file: string;
  title?: string;
  date?: string;
  audience?: string;
  classes?: string;
  expires?: string;
  highlight: boolean;
  body: string;
  warnings: string[];
};

const DE_DATE = /^\d{2}\.\d{2}\.\d{4} \d{2}:\d{2}$/;
const berlinHourFormatter = new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Berlin', hour: '2-digit', hour12: false });
const COMBINED_CLASS_TOKEN = /\b[A-ZÄÖÜ]{1,5}\s*-?\s*\d{1,3}[A-Z]?\b/g;
const SPLIT_CLASS_TOKENS = /[;,/|\s]+/;
const COMMENT_PREFIXES = ['#', '//', ';'];

function isCommentLine(line: string): boolean {
  return COMMENT_PREFIXES.some((prefix) => line.startsWith(prefix));
}

// "ja" → über dem Stundenplan anzeigen; alles andere (oder kein Wert) → nur Pinnwand.
function parseAnzeige(value?: string): boolean {
  return value?.trim().toLowerCase() === 'ja';
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

  // anzeige: ja → über dem Stundenplan + Pinnwand; alles andere → nur Pinnwand.
  const highlight = parseAnzeige(headers.anzeige);

  // Fehlende oder falsch formatierte Felder werden still ignoriert und als "dauerhaft" behandelt.
  // Nur ein fehlender Titel wird als Warnung geloggt, da er für die Anzeige unbedingt nötig ist.
  if (!headers.title) warnings.push("Pflichtfeld 'title' fehlt.");

  return {
    file,
    title: headers.title,
    date: headers.date,
    audience: headers.audience,
    classes: headers.classes,
    expires: headers.expires,
    highlight,
    body,
    warnings,
  };
}

export function parseBerlinDate(value?: string): Date | null {
  if (!value || !DE_DATE.test(value)) return null;
  const [d, t] = value.split(' ');
  const [day, month, year] = d.split('.').map(Number);
  const [hour, minute] = t.split(':').map(Number);
  const noonUtc = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  const berlinNoonHour = parseInt(
    berlinHourFormatter
      .formatToParts(noonUtc)
      .find((p) => p.type === 'hour')?.value ?? '13',
    10,
  );
  const offsetHours = berlinNoonHour - 12;
  return new Date(Date.UTC(year, month - 1, day, hour - offsetHours, minute));
}

export function isActive(item: Announcement, now: Date = new Date()): boolean {
  const expires = parseBerlinDate(item.expires);
  if (!expires) return true;
  return expires.getTime() >= now.getTime();
}

export function announcementClasses(item: Announcement): SchoolClass[] | 'alle' {
  if (item.classes) {
    const classes = extractClassNames(item.classes);
    return classes.length > 0 ? classes : 'alle';
  }
  if (!item.audience || item.audience.toLowerCase() === 'alle') return 'alle';
  const fallbackClasses = extractClassNames(item.audience);
  return fallbackClasses.length > 0 ? fallbackClasses : 'alle';
}

function normalizeClassToken(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function extractClassNames(value: string): SchoolClass[] {
  const combined = value.match(COMBINED_CLASS_TOKEN) ?? [];
  const split = value.split(SPLIT_CLASS_TOKENS);

  const allTokens = [...combined, ...split]
    .map((token) => normalizeClassToken(token))
    .filter((token) => /[A-Z]/.test(token) && /\d/.test(token));

  return [...new Set(allTokens)];
}

export function isVisibleForClass(item: Announcement, schoolClass: SchoolClass): boolean {
  const classes = announcementClasses(item);
  return classes === 'alle' || classes.includes(schoolClass);
}

export function toSpecialEvent(item: Announcement): SpecialEvent | null {
  if (!item.highlight || !item.title || !item.date) return null;

  return {
    id: item.file,
    title: item.title,
    audience: item.audience,
    startsAt: item.date,
    endsAt: item.expires,
    details: item.body,
    classes: announcementClasses(item),
  };
}
