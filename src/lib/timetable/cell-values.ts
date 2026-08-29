/**
 * Was in einer Zelle des Stundenplans stehen kann — und wie man es auseinanderhält.
 *
 * Der Plan ist ein Excel-Export. In den Zellen stehen Fächer, Lehrerkürzel,
 * Raumnummern, Sondertermine und Fehlwerte der Tabellenkalkulation. Ein Kürzel
 * allein verrät nicht, was es ist: „CAD" ist ein Fach, „STI" eine Lehrkraft,
 * „T1" ein Raum. Entschieden wird das über die **Spalte**, in der es steht —
 * diese Datei liefert nur die Formprüfungen dafür.
 */

/** Fehlwerte der Tabellenkalkulation, die als Text im PDF landen. */
const NO_VALUE_PATTERN = /^#(NV|N\/A|WERT!|REF!|BEZUG!|DIV\/0!|NAME\?|ZAHL!|LEER!)$/i;
const NO_VALUE_GLOBAL = /#(NV|N\/A|WERT!|REF!|BEZUG!|DIV\/0!|NAME\?|ZAHL!|LEER!)/gi;

/**
 * Ein Raumkürzel der Schule: Zimmernummern, aber auch „T1", „T2", „W1", „BS"
 * und „HS". Entscheidend ist die Ziffer oder ein bekanntes Kürzel — damit
 * fallen Lehrerkürzel wie „STI" oder „BÜ" nicht darunter.
 */
const ROOM_TOKEN_PATTERN = /^(?:\d{1,3}[A-ZÄÖÜ]?|[A-ZÄÖÜ]{1,3}\d{1,3}[A-ZÄÖÜ]?|BS|HS|TH|AULA|SPH)$/i;

/** Ein Lehrerkürzel: zwei bis sechs Großbuchstaben. */
const TEACHER_TOKEN_PATTERN = /^[A-ZÄÖÜ]{2,6}$/;

export function isNoValue(value: string): boolean {
  const trimmed = (value ?? '').trim();
  return !trimmed || NO_VALUE_PATTERN.test(trimmed);
}

export function stripNoValues(value: string): string {
  return (value ?? '').replace(NO_VALUE_GLOBAL, ' ').replace(/\s+/g, ' ').trim();
}

function splitTokens(value: string, separator: RegExp): string[] {
  return (value ?? '').split(separator).map((token) => token.trim()).filter(Boolean);
}

export function isRoomValue(value: string): boolean {
  const tokens = splitTokens(value, /[\s/+]+/);
  if (tokens.length === 0 || tokens.length > 4) return false;
  if (!tokens.some((token) => !isNoValue(token))) return false;
  return tokens.every((token) => isNoValue(token) || ROOM_TOKEN_PATTERN.test(token));
}

export function isTeacherValue(value: string): boolean {
  const tokens = splitTokens(value, /[\s/]+/);
  if (tokens.length === 0 || tokens.length > 4) return false;
  return tokens.every((token) => TEACHER_TOKEN_PATTERN.test(token));
}

/** Mehrfach genannte Räume auf eine Nennung eindampfen. */
export function tidyRoom(value: string): string {
  const tokens = splitTokens(stripNoValues(value), /\s+/);
  const deduped: string[] = [];
  for (const token of tokens) if (!deduped.includes(token)) deduped.push(token);
  return deduped.join(' ');
}

/** „12.25- 13.10" und „8.00 – 8.45" auf eine Schreibweise bringen. */
export function normalizeTimeRange(value: string): string {
  const match = value.match(/(\d{1,2}[.:]\d{2})\s*[-–—]\s*(\d{1,2}[.:]\d{2})/);
  return match ? `${match[1]} - ${match[2]}` : value.trim();
}

export function mergeTimeRange(from: string, to: string): string {
  const start = from.match(/^(\d{1,2}[.:]\d{2})/);
  const end = to.match(/(\d{1,2}[.:]\d{2})\s*$/);
  return start && end ? `${start[1]} - ${end[1]}` : from;
}

/**
 * Zwei Zeilen einer Zelle zu einem Text verbinden. Ein Trennstrich am Ende der
 * ersten Zeile ist ein Umbruch mitten im Wort („UNTERNEHMENS-" / „PROJEKT").
 */
export function joinCellText(first: string, second: string): string {
  if (!first) return second;
  if (!second) return first;
  if (first.endsWith('-')) return `${first.slice(0, -1)}${second}`;
  return `${first} ${second}`;
}

/**
 * Setzt den über mehrere Zeilen umgebrochenen Text einer Zelle zusammen.
 * Aus „UNTER-" „NEHMENS-" „PROJEKT" wird „UNTERNEHMENSPROJEKT".
 */
export function joinCellLines(lines: string[]): string {
  const cleaned = lines.map((line) => line.replace(/\s+/g, ' ').trim()).filter(Boolean);
  let text = '';
  for (const line of cleaned) text = joinCellText(text, line);
  return text.replace(/\s+/g, ' ').trim();
}
