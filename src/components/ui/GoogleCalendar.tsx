import React from 'react';
import { extractGoogleCalendarIds } from '@/lib/calendar/url-normalization';

// Feste Farben aus Googles Embed-Palette: Ohne `color`-Parameter vergibt Google
// mehreren Kalendern in einem Embed teils dieselbe Farbe — dann sind sie nicht
// auseinanderzuhalten. Positionsweise zu `src` gepaart, deshalb der Index.
const CALENDAR_COLORS = ['#4986E7', '#F83A22', '#16A765', '#FF7537', '#B99AFF', '#42D692'];

export function GoogleCalendar({ urls }: { urls: string[] }) {
  const calendarIds = urls.flatMap((url) => extractGoogleCalendarIds(url));

  if (calendarIds.length === 0) return null;

  const combined = new URL('https://calendar.google.com/calendar/embed');
  calendarIds.forEach((id, index) => {
    combined.searchParams.append('src', id);
    combined.searchParams.append('color', CALENDAR_COLORS[index % CALENDAR_COLORS.length]);
  });
  combined.searchParams.set('ctz', 'Europe/Berlin');

  return (
    // Kein eigener Außenabstand: Der Kalender steht mal allein, mal in einem
    // Raster mit Abständen — den Abstand setzt die Seite, nicht die Komponente.
    <div className="card surface">
      <h2 className="text-base font-bold mb-3">Kalender</h2>
      <div className="google-cal-wrapper">
        <iframe
          src={combined.toString()}
          style={{ border: 0, display: 'block' }}
          width="100%"
          height="600"
          title="Google Kalender"
          loading="lazy"
          sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
          className="h-[420px] w-full sm:h-[600px]"
        />
      </div>
    </div>
  );
}
