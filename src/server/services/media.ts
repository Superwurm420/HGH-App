import { MediaFile } from '../types';

/** Kategorie der Bilder, die auf der TV-Ansicht rotieren. */
export const TV_SLIDESHOW_CATEGORY = 'tv-slideshow';

export const MAX_IMAGE_SIZE = 8 * 1024 * 1024;

interface ImageType {
  contentType: string;
  extension: string;
  /** Erste Bytes der Datei — der Dateiname allein ist keine Typprüfung. */
  matches: (bytes: Uint8Array) => boolean;
}

const IMAGE_TYPES: ImageType[] = [
  {
    contentType: 'image/jpeg',
    extension: 'jpg',
    matches: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  },
  {
    contentType: 'image/png',
    extension: 'png',
    matches: (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47,
  },
  {
    contentType: 'image/gif',
    extension: 'gif',
    matches: (b) => b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46,
  },
  {
    contentType: 'image/webp',
    extension: 'webp',
    // "RIFF" .... "WEBP"
    matches: (b) =>
      b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
      b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50,
  },
];

export const ALLOWED_IMAGE_TYPES = IMAGE_TYPES.map((type) => type.contentType);

/**
 * Ermittelt den Bildtyp anhand der Datei-Signatur.
 * Gibt null zurück, wenn es kein unterstütztes Bild ist.
 */
export function detectImageType(data: Uint8Array): ImageType | null {
  const bytes = data.subarray(0, 16);
  return IMAGE_TYPES.find((type) => type.matches(bytes)) ?? null;
}

/** Bilder der TV-Slideshow, älteste zuerst — das ist die Reihenfolge der Anzeige. */
export async function loadSlideshowImages(db: D1Database): Promise<MediaFile[]> {
  const rows = await db.prepare(
    'SELECT * FROM media_files WHERE category = ? ORDER BY created_at ASC'
  ).bind(TV_SLIDESHOW_CATEGORY).all<MediaFile>();
  return rows.results;
}

/** Ein einzelnes Medium anhand seiner ID. */
export async function loadMediaFile(db: D1Database, id: string): Promise<MediaFile | null> {
  return db.prepare('SELECT * FROM media_files WHERE id = ?').bind(id).first<MediaFile>();
}
