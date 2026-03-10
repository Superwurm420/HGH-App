const GOOGLE_CALENDAR_HOSTS = new Set([
  'calendar.google.com',
  'www.google.com',
]);

function parseCalendarId(value: string | null): string[] {
  if (!value) return [];

  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      try {
        return decodeURIComponent(entry);
      } catch {
        return entry;
      }
    });
}

export function extractGoogleCalendarIds(inputUrl: string): string[] {
  try {
    const url = new URL(inputUrl);

    if (!GOOGLE_CALENDAR_HOSTS.has(url.hostname)) {
      return [];
    }

    const ids = [
      ...parseCalendarId(url.searchParams.get('cid')),
      ...url.searchParams.getAll('src').flatMap((value) => parseCalendarId(value)),
    ];

    return Array.from(new Set(ids));
  } catch {
    return [];
  }
}
