/**
 * Base64-Dekodierung für Datei-Uploads (Serverseite).
 *
 * Gegenstück zu `src/lib/base64.ts`. Eigene Fehlerklasse, damit die Routen
 * „ungültiges Base64" von echten Serverfehlern unterscheiden und mit einer
 * verständlichen deutschen Meldung mit 400 antworten können.
 */

export class Base64DecodeError extends Error {
  constructor(message = 'Die Datei konnte nicht dekodiert werden.') {
    super(message);
    this.name = 'Base64DecodeError';
  }
}

export function base64ToBytes(value: string): Uint8Array {
  let binary: string;
  try {
    binary = atob(value);
  } catch {
    throw new Base64DecodeError();
  }

  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}
