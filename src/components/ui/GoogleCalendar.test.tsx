import React from 'react';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { GoogleCalendar } from './GoogleCalendar';

describe('GoogleCalendar', () => {
  it('zeigt einen gespeicherten Nicht-Embed-Google-Link korrekt als Embed an', () => {
    const html = renderToStaticMarkup(
      <GoogleCalendar urls={['https://calendar.google.com/calendar/u/0/r?cid=test%40group.calendar.google.com']} />,
    );

    expect(html).toContain('iframe');
    expect(html).toContain(
      'https://calendar.google.com/calendar/embed?src=test%40group.calendar.google.com&amp;color=%234986E7&amp;ctz=Europe%2FBerlin',
    );
  });

  it('gibt zwei Kalendern unterschiedliche Farben', () => {
    const html = renderToStaticMarkup(
      <GoogleCalendar
        urls={[
          'https://calendar.google.com/calendar/u/0/r?cid=eins%40group.calendar.google.com',
          'https://calendar.google.com/calendar/u/0/r?cid=zwei%40group.calendar.google.com',
        ]}
      />,
    );

    // Erster Kalender bekommt die erste, zweiter die zweite Palettenfarbe.
    expect(html).toContain('src=eins%40group.calendar.google.com&amp;color=%234986E7');
    expect(html).toContain('src=zwei%40group.calendar.google.com&amp;color=%23F83A22');
  });
});
