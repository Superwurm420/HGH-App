import React from 'react';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { TimetableMeta } from './TimetableMeta';

describe('TimetableMeta', () => {
  it('stellt die Kalenderwoche vor das Aktualisierungsdatum', () => {
    const html = renderToStaticMarkup(
      <TimetableMeta upload={{ calendar_week: 36, updated_at: '2026-08-29 07:15:00' }} />,
    );

    expect(html).toContain('KW 36');
    expect(html).toContain('Aktualisiert: 29.08.2026');
  });

  it('zeigt nur das Datum, wenn der Dateiname keine Kalenderwoche hergab', () => {
    const html = renderToStaticMarkup(
      <TimetableMeta upload={{ calendar_week: null, updated_at: '2026-08-29 07:15:00' }} />,
    );

    expect(html).not.toContain('KW');
    expect(html).toContain('Aktualisiert: 29.08.2026');
  });

  it('übernimmt den Wortlaut der TV-Ansicht', () => {
    const html = renderToStaticMarkup(
      <TimetableMeta
        upload={{ calendar_week: 2, updated_at: '2026-01-08 07:15:00' }}
        label="Stand Stundenplan"
        className="text-sm text-muted"
      />,
    );

    expect(html).toContain('KW 2 · Stand Stundenplan: 08.01.2026');
    expect(html).toContain('text-sm text-muted');
  });

  it('zeigt nichts an, wenn kein Upload vorliegt', () => {
    expect(renderToStaticMarkup(<TimetableMeta upload={null} />)).toBe('');
  });
});
