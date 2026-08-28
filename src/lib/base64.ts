/**
 * Base64-Kodierung für Datei-Uploads aus dem Browser.
 *
 * Der Adminbereich schickt Dateien als JSON-Feld statt als Multipart: Der
 * JSON-Weg ist der einzige, der im Worker zuverlässig ankommt, und er wird von
 * allen anderen Admin-Routen ohnehin benutzt.
 */

/** Blockweise, damit `String.fromCharCode` nicht am Argument-Limit scheitert. */
const CHUNK_SIZE = 0x8000;

export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';

  for (let offset = 0; offset < bytes.length; offset += CHUNK_SIZE) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + CHUNK_SIZE));
  }

  return btoa(binary);
}
