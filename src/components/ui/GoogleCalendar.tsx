export function GoogleCalendar({ urls }: { urls: string[] }) {
  const calendarIds = urls.flatMap((url) => {
    try {
      const parsed = new URL(url);
      return parsed.searchParams.getAll('src');
    } catch {
      return [];
    }
  });

  if (calendarIds.length === 0) return null;

  const combined = new URL('https://calendar.google.com/calendar/embed');
  for (const id of calendarIds) {
    combined.searchParams.append('src', id);
  }
  combined.searchParams.set('ctz', 'Europe/Berlin');

  return (
    <div className="card surface mt-3">
      <h2 className="text-base font-bold mb-3">Kalender</h2>
      <div className="google-cal-wrapper">
        <iframe
          src={combined.toString()}
          style={{ border: 0 }}
          width="100%"
          height="600"
          title="Google Kalender"
          loading="lazy"
          sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
          className="rounded-xl"
        />
      </div>
    </div>
  );
}
