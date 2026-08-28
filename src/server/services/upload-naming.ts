/**
 * Namens- und Metadaten-Aufbereitung für Stundenplan-Uploads.
 *
 * Eigenes Modul, weil eine Next.js `route.ts` nur die HTTP-Methoden und die
 * bekannten Konfigurations-Exporte enthalten darf — Helfer gehören daneben.
 */

/** Umlaute und ß, damit aus ihnen im R2-Schlüssel lesbare Buchstaben werden. */
const TRANSLITERATIONS: Record<string, string> = {
  'Ä': 'Ae', 'Ö': 'Oe', 'Ü': 'Ue', 'ä': 'ae', 'ö': 'oe', 'ü': 'ue', 'ß': 'ss',
};

/**
 * R2 legt `customMetadata` als HTTP-Header ab — dort sind nur ASCII-Zeichen
 * erlaubt. Ein Dateiname wie „Stundenplan_Übersicht.pdf" lässt `put()` sonst
 * werfen, und der Upload scheitert mit einer nichtssagenden 500. Der
 * ungekürzte Originalname steht ohnehin in `timetable_uploads.filename`; die
 * R2-Metadaten sind nur Beiwerk.
 */
export function toAsciiMetadata(filename: string): string {
  return encodeURIComponent(filename).slice(0, 1024);
}

/** Baut einen R2-Schlüssel, der garantiert nur unproblematische Zeichen enthält. */
export function buildR2Key(filename: string, now: number = Date.now()): string {
  const safe = filename
    .replace(/[ÄÖÜäöüß]/g, (char) => TRANSLITERATIONS[char] ?? char)
    .replace(/[^A-Za-z0-9._-]/g, '_')
    .replace(/_{2,}/g, '_')
    .slice(0, 120);

  return `timetables/${now}_${safe || 'stundenplan.pdf'}`;
}

/**
 * `half_year` hat in D1 ein CHECK auf (1, 2). Ein Dateiname mit „Hj3" würde den
 * INSERT sonst zum Werfen bringen, statt einfach ohne Halbjahr auszukommen.
 */
export function normalizeHalfYear(halfYear: number | null | undefined): number | null {
  return halfYear === 1 || halfYear === 2 ? halfYear : null;
}
