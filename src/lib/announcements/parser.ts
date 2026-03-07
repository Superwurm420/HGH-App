/**
 * Parst ein deutsches Datum (DD.MM.YYYY HH:mm) als Berlin-Zeitzone.
 * Verwendet Intl.DateTimeFormat um den korrekten UTC-Offset zu ermitteln
 * (CET +01:00 im Winter, CEST +02:00 im Sommer).
 */
export function parseBerlinDate(dateStr: string): Date | null {
  const match = dateStr.match(/^(\d{2})\.(\d{2})\.(\d{4})\s+(\d{2}):(\d{2})$/);
  if (!match) return null;

  const [, dayStr, monthStr, yearStr, hourStr, minuteStr] = match;
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);
  const hour = Number(hourStr);
  const minute = Number(minuteStr);

  // Erst mit CET (+01:00) als Näherung starten
  const approx = new Date(`${yearStr}-${monthStr}-${dayStr}T${hourStr}:${minuteStr}:00+01:00`);
  if (Number.isNaN(approx.getTime())) return null;

  // Tatsächlichen Berlin-Offset für dieses Datum ermitteln
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Berlin',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(approx);
  const berlinHour = Number(parts.find((p) => p.type === 'hour')?.value ?? 0);

  // Differenz zwischen gewünschter Stunde und was Berlin-Formatierung zeigt
  const hourDiff = hour - berlinHour;
  if (hourDiff !== 0) {
    approx.setTime(approx.getTime() + hourDiff * 3600_000);
  }

  // Prüfe Ergebnis
  const verifyParts = formatter.formatToParts(approx);
  const vDay = Number(verifyParts.find((p) => p.type === 'day')?.value ?? 0);
  const vMonth = Number(verifyParts.find((p) => p.type === 'month')?.value ?? 0);
  const vYear = Number(verifyParts.find((p) => p.type === 'year')?.value ?? 0);
  const vHour = Number(verifyParts.find((p) => p.type === 'hour')?.value ?? 0);
  const vMinute = Number(verifyParts.find((p) => p.type === 'minute')?.value ?? 0);

  if (vDay !== day || vMonth !== month || vYear !== year || vHour !== hour || vMinute !== minute) {
    return null;
  }

  return approx;
}
