export function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function validateMessagesData(data: unknown): string | null {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return 'Meldungen müssen ein Objekt sein.';
  }

  const obj = data as Record<string, unknown>;

  if (!obj.standard || typeof obj.standard !== 'object' || Array.isArray(obj.standard)) {
    return 'Meldungen benötigen ein Objekt unter "standard".';
  }

  if (obj.klassen !== undefined && (typeof obj.klassen !== 'object' || obj.klassen === null || Array.isArray(obj.klassen))) {
    return 'Meldungen: "klassen" muss ein Objekt sein.';
  }

  return null;
}

export function validateHolidayRanges(ranges: unknown): string | null {
  if (!Array.isArray(ranges)) {
    return '"ranges" muss ein Array sein.';
  }

  for (let index = 0; index < ranges.length; index += 1) {
    const range = ranges[index] as Record<string, unknown> | null;
    if (!range || typeof range !== 'object') {
      return `Ferienbereich ${index + 1} ist ungültig.`;
    }

    const start = range.start;
    const end = range.end;
    if (typeof start !== 'string' || typeof end !== 'string' || !isIsoDate(start) || !isIsoDate(end)) {
      return `Ferienbereich ${index + 1} braucht start/end im Format YYYY-MM-DD.`;
    }

    if (start > end) {
      return `Ferienbereich ${index + 1} hat start nach end.`;
    }
  }

  return null;
}
