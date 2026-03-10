/**
 * Extrahiert Google Calendar IDs aus verschiedenen URL-Formaten.
 *
 * Unterstützte Formate:
 * - https://calendar.google.com/calendar/embed?src=CALENDAR_ID
 * - https://calendar.google.com/calendar/ical/CALENDAR_ID/basic.ics
 * - Direkte Calendar-ID (z.B. "abc@group.calendar.google.com")
 */
export function extractGoogleCalendarIds(input: string): string[] {
  const trimmed = input.trim();
  if (!trimmed) return [];

  try {
    const url = new URL(trimmed);

    // embed URL: extract all "src" params
    if (url.pathname.includes('/calendar/embed')) {
      const srcs = url.searchParams.getAll('src');
      return srcs.filter((s) => s.length > 0);
    }

    // ical URL: extract calendar ID from path
    const icalMatch = url.pathname.match(/\/calendar\/ical\/([^/]+)\//);
    if (icalMatch) {
      return [decodeURIComponent(icalMatch[1])];
    }
  } catch {
    // Not a URL — treat as raw calendar ID
  }

  // Raw calendar ID (e.g. "abc@group.calendar.google.com")
  if (trimmed.includes('@')) {
    return [trimmed];
  }

  return [];
}
