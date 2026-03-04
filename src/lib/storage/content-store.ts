import fs from 'node:fs/promises';
import path from 'node:path';
import {
  uploadToStorage,
  deleteFromStorage,
  downloadFromStorage,
  insertContentItem,
  deleteContentItem,
} from '@/lib/supabase/content-store';


export type ContentStoreObject = {
  key: string;
  data: Buffer;
  contentType: string | null;
};

export type ContentStoreListItem = {
  key: string;
  contentType: string | null;
  size: number;
  updatedAt: Date | null;
};

export type ContentStorePutResult = {
  key: string;
  url?: string;
  size?: number;
  contentType?: string;
};

export interface ContentStore {
  getObject(key: string): Promise<ContentStoreObject | null>;
  putObject(key: string, data: Buffer | string, contentType: string): Promise<ContentStorePutResult>;
  deleteObject(key: string, options?: { url?: string }): Promise<void>;
}

export class ContentStoreError extends Error {
  readonly reason: string;

  constructor(reason: string, options?: ErrorOptions) {
    super(`Storage-Fehler: ${reason}`, options);
    this.name = 'ContentStoreError';
    this.reason = reason;
  }
}

export class ContentStoreConfigurationError extends ContentStoreError {
  constructor(reason: string) {
    super(reason);
    this.name = 'ContentStoreConfigurationError';
  }
}

export class ContentStoreUnavailableError extends ContentStoreError {
  constructor(reason: string, options?: ErrorOptions) {
    super(reason, options);
    this.name = 'ContentStoreUnavailableError';
  }
}

function normalizeKey(key: string): string {
  return key.replace(/^\/+/, '').trim();
}

function toBuffer(data: Buffer | string): Buffer {
  return typeof data === 'string' ? Buffer.from(data, 'utf8') : data;
}

function detectCategory(key: string, contentType: string): 'timetable' | 'announcement' | 'image' | 'config' | 'other' {
  if (key.startsWith('timetables/') || contentType === 'application/pdf') return 'timetable';
  if (key.startsWith('announcements/')) return 'announcement';
  if (key.startsWith('images/') || contentType.startsWith('image/')) return 'image';
  if (contentType.includes('json') || key.endsWith('.json')) return 'config';
  return 'other';
}

// ---------------------------------------------------------------------------
// Lokaler Fallback-Store (für Development ohne Supabase)
// ---------------------------------------------------------------------------

class LocalContentStore implements ContentStore {
  private readonly localRoot: string;

  constructor(localRoot: string) {
    this.localRoot = localRoot;
  }

  private localPathForKey(key: string): string {
    const normalized = normalizeKey(key);
    return path.join(this.localRoot, ...normalized.split('/'));
  }

  async getObject(key: string): Promise<ContentStoreObject | null> {
    const filePath = this.localPathForKey(key);
    try {
      const data = await fs.readFile(filePath);
      return {
        key: normalizeKey(key),
        data,
        contentType: null,
      };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return null;
      }
      throw new ContentStoreUnavailableError(`Lokaler Store konnte ${key} nicht lesen.`, error instanceof Error ? { cause: error } : undefined);
    }
  }

  async putObject(key: string, data: Buffer | string): Promise<ContentStorePutResult> {
    const filePath = this.localPathForKey(key);
    const payload = toBuffer(data);
    try {
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, payload);
      return {
        key: normalizeKey(key),
        size: payload.byteLength,
      };
    } catch (error) {
      throw new ContentStoreUnavailableError(`Lokaler Store konnte ${key} nicht schreiben.`, error instanceof Error ? { cause: error } : undefined);
    }
  }

  async deleteObject(key: string): Promise<void> {
    const filePath = this.localPathForKey(key);
    try {
      await fs.rm(filePath, { force: true });
    } catch (error) {
      throw new ContentStoreUnavailableError(`Lokaler Store konnte ${key} nicht löschen.`, error instanceof Error ? { cause: error } : undefined);
    }
  }
}

// ---------------------------------------------------------------------------
// Supabase-basierter Store
// ---------------------------------------------------------------------------

class SupabaseContentStore implements ContentStore {
  async getObject(key: string): Promise<ContentStoreObject | null> {
    const normalizedKey = normalizeKey(key);
    try {
      const result = await downloadFromStorage(normalizedKey);
      if (!result) return null;
      return {
        key: normalizedKey,
        data: result.data,
        contentType: result.contentType,
      };
    } catch (error) {
      throw new ContentStoreUnavailableError(
        `Supabase konnte ${normalizedKey} nicht lesen.`,
        error instanceof Error ? { cause: error } : undefined,
      );
    }
  }

  async putObject(key: string, data: Buffer | string, contentType: string): Promise<ContentStorePutResult> {
    const normalizedKey = normalizeKey(key);
    const payload = toBuffer(data);
    try {
      const url = await uploadToStorage(normalizedKey, payload, contentType);

      await insertContentItem({
        key: normalizedKey,
        url,
        category: detectCategory(normalizedKey, contentType),
        content_type: contentType,
        size: payload.byteLength,
      });

      return {
        key: normalizedKey,
        url,
        size: payload.byteLength,
        contentType,
      };
    } catch (error) {
      throw new ContentStoreUnavailableError(
        `Supabase konnte ${normalizedKey} nicht schreiben.`,
        error instanceof Error ? { cause: error } : undefined,
      );
    }
  }

  async deleteObject(key: string): Promise<void> {
    const normalizedKey = normalizeKey(key);
    try {
      await deleteFromStorage(normalizedKey).catch((err) => {
        console.warn(`[content-store] Storage-Löschung für ${normalizedKey} fehlgeschlagen.`, err);
      });
      await deleteContentItem(normalizedKey);
    } catch (error) {
      throw new ContentStoreUnavailableError(
        `Supabase konnte ${normalizedKey} nicht löschen.`,
        error instanceof Error ? { cause: error } : undefined,
      );
    }
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function getContentStore(): ContentStore {
  const isDevelopment = process.env.NODE_ENV === 'development';
  const hasSupabase = Boolean(process.env.SUPABASE_URL?.trim() && process.env.SUPABASE_SERVICE_ROLE_KEY?.trim());
  const forceLocal = process.env.CONTENT_STORE_PROVIDER?.trim().toLowerCase() === 'local';

  if (forceLocal || (isDevelopment && !hasSupabase)) {
    const localRoot = path.join(process.cwd(), process.env.LOCAL_CONTENT_STORE_DIR ?? 'data/content-store');
    return new LocalContentStore(localRoot);
  }

  if (!hasSupabase) {
    throw new ContentStoreConfigurationError(
      'SUPABASE_URL und SUPABASE_SERVICE_ROLE_KEY müssen gesetzt sein. Setze CONTENT_STORE_PROVIDER=local für lokalen Fallback.',
    );
  }

  return new SupabaseContentStore();
}
