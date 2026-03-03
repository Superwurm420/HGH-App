const GOOGLE_CALENDAR_HOST = 'calendar.google.com';
const GOOGLE_CALENDAR_EMBED_PATH = '/calendar/embed';

function toCalendarId(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const withoutPrefix = trimmed.startsWith('cid=') ? trimmed.slice(4) : trimmed;

  try {
    const decoded = decodeURIComponent(withoutPrefix).trim();
    return decoded || null;
  } catch {
    return withoutPrefix || null;
  }
}

function collectIdsFromUrl(value: string): string[] {
  try {
    const parsed = new URL(value);
    const ids = [
      ...parsed.searchParams.getAll('src'),
      ...parsed.searchParams.getAll('cid'),
    ]
      .map((id) => toCalendarId(id))
      .filter((id): id is string => Boolean(id));

    if (ids.length > 0) {
      return ids;
    }

    if (parsed.host === GOOGLE_CALENDAR_HOST) {
      const pathnameId = toCalendarId(parsed.pathname.split('/').at(-1) ?? '');
      return pathnameId ? [pathnameId] : [];
    }

    return [];
  } catch {
    return [];
  }
}

export function extractGoogleCalendarIds(value: string): string[] {
  const trimmed = value.trim();
  if (!trimmed) {
    return [];
  }

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return collectIdsFromUrl(trimmed);
  }

  const directId = toCalendarId(trimmed);
  return directId ? [directId] : [];
}

export function toGoogleCalendarEmbedUrl(value: string): string | null {
  const [firstId] = extractGoogleCalendarIds(value);
  if (!firstId) {
    return null;
  }

  const normalized = new URL(`https://${GOOGLE_CALENDAR_HOST}${GOOGLE_CALENDAR_EMBED_PATH}`);
  normalized.searchParams.set('src', firstId);
  return normalized.toString();
}

export function toGoogleCalendarEmbedUrls(values: string[]): string[] {
  const unique = new Set<string>();

  for (const value of values) {
    const normalized = toGoogleCalendarEmbedUrl(value);
    if (normalized) {
      unique.add(normalized);
    }
  }

  return [...unique];
}
