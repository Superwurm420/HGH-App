import { formatBerlinDay } from '@/lib/berlin-time';

interface TimetableMetaProps {
  /** Der aktive Upload — kommt aus `TimetableView.upload`. */
  upload: { calendar_week: number | null; updated_at: string } | null;
  /** Wortlaut vor dem Datum. Die TV-Ansicht benutzt eine eigene Formulierung. */
  label?: string;
  /** Auf dem TV sitzt die Zeile in der Kopfspalte und ist größer gesetzt. */
  className?: string;
}

/**
 * Fußzeile unter den Stundenplan-Ansichten.
 *
 * Steht auf Startseite, Tages-, Wochen- und TV-Ansicht gleichlautend da —
 * deshalb hier gebündelt statt viermal kopiert. Die Kalenderwoche stammt aus
 * dem Dateinamen des Uploads und fehlt, wenn dieser nicht der Konvention
 * folgte; dann bleibt es beim reinen Datum.
 */
export function TimetableMeta({ upload, label = 'Aktualisiert', className = 'meta-note' }: TimetableMetaProps) {
  if (!upload?.updated_at) return null;

  return (
    <p className={className}>
      {upload.calendar_week != null && `KW ${upload.calendar_week} · `}
      {label}: {formatBerlinDay(upload.updated_at)}
    </p>
  );
}
