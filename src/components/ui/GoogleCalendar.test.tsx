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
      'https://calendar.google.com/calendar/embed?src=test%40group.calendar.google.com&amp;ctz=Europe%2FBerlin',
    );
  });
});
