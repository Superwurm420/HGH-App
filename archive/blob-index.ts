import { getContentStore } from '@/lib/storage/content-store';
import { STORAGE_KEYS } from '@/lib/storage/object-keys';

export type BlobAssetType = 'timetable' | 'announcement' | 'image';

export type BlobIndexEntry = {
  pathname: string;
  type: BlobAssetType;
  uploadedAt: string;
  url?: string;
  originalName?: string;
  size?: number;
  contentType?: string;
};

export type BlobIndex = {
  version: 1;
  updatedAt: string;
  timetables: BlobIndexEntry[];
  announcements: BlobIndexEntry[];
  images: BlobIndexEntry[];
};

const EMPTY_INDEX = (): BlobIndex => ({
  version: 1,
  updatedAt: new Date(0).toISOString(),
  timetables: [],
  announcements: [],
  images: [],
});

function sanitizeEntry(entry: unknown): BlobIndexEntry | null {
  if (!entry || typeof entry !== 'object') return null;
  const raw = entry as Partial<BlobIndexEntry>;
  const pathname = typeof raw.pathname === 'string' ? raw.pathname.trim() : '';
  if (!pathname) return null;

  const type = raw.type === 'announcement' || raw.type === 'image' || raw.type === 'timetable' ? raw.type : null;
  if (!type) return null;

  const uploadedAt = typeof raw.uploadedAt === 'string' && raw.uploadedAt.trim() ? raw.uploadedAt : new Date().toISOString();

  return {
    pathname,
    type,
    uploadedAt,
    url: typeof raw.url === 'string' && raw.url ? raw.url : undefined,
    originalName: typeof raw.originalName === 'string' && raw.originalName ? raw.originalName : undefined,
    size: typeof raw.size === 'number' ? raw.size : undefined,
    contentType: typeof raw.contentType === 'string' && raw.contentType ? raw.contentType : undefined,
  };
}

function sanitizeEntries(value: unknown): BlobIndexEntry[] {
  if (!Array.isArray(value)) return [];
  return value.map((entry) => sanitizeEntry(entry)).filter((entry): entry is BlobIndexEntry => entry !== null);
}

export async function readBlobIndex(): Promise<BlobIndex> {
  const store = getContentStore();
  const object = await store.getObject(STORAGE_KEYS.blobIndex);

  if (!object) {
    console.info('[blob-index] Index fehlt, nutze leeren Index.');
    return EMPTY_INDEX();
  }

  try {
    const parsed = JSON.parse(object.data.toString('utf8')) as Partial<BlobIndex>;
    return {
      version: 1,
      updatedAt: typeof parsed.updatedAt === 'string' && parsed.updatedAt ? parsed.updatedAt : new Date().toISOString(),
      timetables: sanitizeEntries(parsed.timetables),
      announcements: sanitizeEntries(parsed.announcements),
      images: sanitizeEntries(parsed.images),
    };
  } catch (error) {
    console.error('[blob-index] Index konnte nicht geparst werden.', error);
    return EMPTY_INDEX();
  }
}

export async function writeBlobIndex(index: BlobIndex): Promise<void> {
  const store = getContentStore();
  const payload: BlobIndex = {
    ...index,
    version: 1,
    updatedAt: new Date().toISOString(),
  };
  await store.putObject(STORAGE_KEYS.blobIndex, `${JSON.stringify(payload, null, 2)}\n`, 'application/json; charset=utf-8');
  console.info('[blob-index] Index gespeichert.');
}

export async function mutateBlobIndex(
  mutate: (index: BlobIndex) => BlobIndex,
  options?: { retries?: number },
): Promise<BlobIndex> {
  const retries = options?.retries ?? 3;

  let lastError: unknown;
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      const current = await readBlobIndex();
      const next = mutate(current);
      await writeBlobIndex(next);
      return next;
    } catch (error) {
      lastError = error;
      console.error(`[blob-index] Aktualisierung fehlgeschlagen (Versuch ${attempt}/${retries}).`, error);
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Index-Aktualisierung fehlgeschlagen.');
}
