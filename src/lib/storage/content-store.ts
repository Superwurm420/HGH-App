import fs from 'node:fs/promises';
import path from 'node:path';
import {
  uploadToStorage,
  deleteFromStorage,
  downloadFromStorage,
  insertContentItem,
  deleteContentItem,
  listContentItems,
  getContentItem,
  updateContentItem,
} from '@/lib/supabase/content-store';
import type { ContentCategory } from '@/lib/supabase/db-types';


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

/** Zeile aus dem Content-Index (entspricht content_items in Supabase). */
export type ContentStoreItemRow = {
  key: string;
  url: string;
  category: ContentCategory;
  content_type: string | null;
  size: number | null;
  created_at: string;
  meta: Record<string, unknown> | null;
  timetable_json: Record<string, unknown> | null;
  timetable_version: string | null;
};

/** Felder, die beim Aktualisieren eines Items übergeben werden können. */
export type ContentStoreItemUpdate = {
  meta?: Record<string, unknown> | null;
  timetable_json?: Record<string, unknown> | null;
  timetable_version?: string | null;
};

/** Optionen für putObject mit erweiterten Metadaten. */
export type ContentStorePutOptions = {
  category?: ContentCategory;
  meta?: Record<string, unknown>;
};

export interface ContentStore {
  getObject(key: string): Promise<ContentStoreObject | null>;
  putObject(key: string, data: Buffer | string, contentType: string, options?: ContentStorePutOptions): Promise<ContentStorePutResult>;
  deleteObject(key: string, options?: { url?: string }): Promise<void>;

  /** Listet alle Index-Einträge, optional gefiltert nach Kategorie. */
  listItems(category?: ContentCategory): Promise<ContentStoreItemRow[]>;
  /** Gibt einen einzelnen Index-Eintrag zurück. */
  getItem(key: string): Promise<ContentStoreItemRow | null>;
  /** Aktualisiert Meta-/Timetable-Daten eines bestehenden Eintrags. */
  updateItem(key: string, updates: ContentStoreItemUpdate): Promise<void>;
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

function detectCategory(key: string, contentType: string): ContentCategory {
  if (key.startsWith('timetables/') || contentType === 'application/pdf') return 'timetable';
  if (key.startsWith('announcements/')) return 'announcement';
  if (key.startsWith('images/') || contentType.startsWith('image/')) return 'image';
  if (contentType.includes('json') || key.endsWith('.json')) return 'config';
  return 'other';
}

// ---------------------------------------------------------------------------
// Lokaler Fallback-Store (für Development ohne Supabase)
// ---------------------------------------------------------------------------

const LOCAL_INDEX_FILE = '_index.json';

type LocalIndex = {
  items: ContentStoreItemRow[];
};

class LocalContentStore implements ContentStore {
  private readonly localRoot: string;

  constructor(localRoot: string) {
    this.localRoot = localRoot;
  }

  private localPathForKey(key: string): string {
    const normalized = normalizeKey(key);
    return path.join(this.localRoot, ...normalized.split('/'));
  }

  private get indexPath(): string {
    return path.join(this.localRoot, LOCAL_INDEX_FILE);
  }

  private async readIndex(): Promise<LocalIndex> {
    try {
      const raw = await fs.readFile(this.indexPath, 'utf8');
      const parsed = JSON.parse(raw) as Partial<LocalIndex>;
      return { items: Array.isArray(parsed.items) ? parsed.items : [] };
    } catch {
      return { items: [] };
    }
  }

  private async writeIndex(index: LocalIndex): Promise<void> {
    await fs.mkdir(this.localRoot, { recursive: true });
    await fs.writeFile(this.indexPath, JSON.stringify(index, null, 2) + '\n', 'utf8');
  }

  private async upsertIndexEntry(entry: ContentStoreItemRow): Promise<void> {
    const index = await this.readIndex();
    const existing = index.items.findIndex((item) => item.key === entry.key);
    if (existing >= 0) {
      index.items[existing] = entry;
    } else {
      index.items.push(entry);
    }
    await this.writeIndex(index);
  }

  private async removeIndexEntry(key: string): Promise<void> {
    const index = await this.readIndex();
    index.items = index.items.filter((item) => item.key !== key);
    await this.writeIndex(index);
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

  async putObject(key: string, data: Buffer | string, contentType: string, options?: ContentStorePutOptions): Promise<ContentStorePutResult> {
    const normalizedKey = normalizeKey(key);
    const filePath = this.localPathForKey(normalizedKey);
    const payload = toBuffer(data);
    try {
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, payload);

      const category = options?.category ?? detectCategory(normalizedKey, contentType);

      await this.upsertIndexEntry({
        key: normalizedKey,
        url: `file://${filePath}`,
        category,
        content_type: contentType,
        size: payload.byteLength,
        created_at: new Date().toISOString(),
        meta: options?.meta ?? null,
        timetable_json: null,
        timetable_version: null,
      });

      return {
        key: normalizedKey,
        size: payload.byteLength,
        contentType,
      };
    } catch (error) {
      throw new ContentStoreUnavailableError(`Lokaler Store konnte ${key} nicht schreiben.`, error instanceof Error ? { cause: error } : undefined);
    }
  }

  async deleteObject(key: string): Promise<void> {
    const normalizedKey = normalizeKey(key);
    const filePath = this.localPathForKey(normalizedKey);
    try {
      await fs.rm(filePath, { force: true });
      await this.removeIndexEntry(normalizedKey);
    } catch (error) {
      throw new ContentStoreUnavailableError(`Lokaler Store konnte ${key} nicht löschen.`, error instanceof Error ? { cause: error } : undefined);
    }
  }

  async listItems(category?: ContentCategory): Promise<ContentStoreItemRow[]> {
    const index = await this.readIndex();
    const items = category ? index.items.filter((item) => item.category === category) : index.items;
    return items.map((item) => ({ ...item }));
  }

  async getItem(key: string): Promise<ContentStoreItemRow | null> {
    const normalizedKey = normalizeKey(key);
    const index = await this.readIndex();
    return index.items.find((item) => item.key === normalizedKey) ?? null;
  }

  async updateItem(key: string, updates: ContentStoreItemUpdate): Promise<void> {
    const normalizedKey = normalizeKey(key);
    const index = await this.readIndex();
    const entry = index.items.find((item) => item.key === normalizedKey);
    if (!entry) return;

    if (updates.meta !== undefined) entry.meta = updates.meta;
    if (updates.timetable_json !== undefined) entry.timetable_json = updates.timetable_json;
    if (updates.timetable_version !== undefined) entry.timetable_version = updates.timetable_version;

    await this.writeIndex(index);
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

  async putObject(key: string, data: Buffer | string, contentType: string, options?: ContentStorePutOptions): Promise<ContentStorePutResult> {
    const normalizedKey = normalizeKey(key);
    const payload = toBuffer(data);
    try {
      const url = await uploadToStorage(normalizedKey, payload, contentType);
      const category = options?.category ?? detectCategory(normalizedKey, contentType);

      await insertContentItem({
        key: normalizedKey,
        url,
        category,
        content_type: contentType,
        size: payload.byteLength,
        meta: options?.meta ?? null,
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

  async listItems(category?: ContentCategory): Promise<ContentStoreItemRow[]> {
    try {
      const items = await listContentItems(category);
      return items.map((item) => ({
        key: item.key,
        url: item.url,
        category: item.category,
        content_type: item.content_type,
        size: item.size,
        created_at: item.created_at,
        meta: item.meta,
        timetable_json: item.timetable_json,
        timetable_version: item.timetable_version,
      }));
    } catch (error) {
      throw new ContentStoreUnavailableError(
        'Supabase konnte die Einträge nicht auflisten.',
        error instanceof Error ? { cause: error } : undefined,
      );
    }
  }

  async getItem(key: string): Promise<ContentStoreItemRow | null> {
    const normalizedKey = normalizeKey(key);
    try {
      const item = await getContentItem(normalizedKey);
      if (!item) return null;
      return {
        key: item.key,
        url: item.url,
        category: item.category,
        content_type: item.content_type,
        size: item.size,
        created_at: item.created_at,
        meta: item.meta,
        timetable_json: item.timetable_json,
        timetable_version: item.timetable_version,
      };
    } catch (error) {
      throw new ContentStoreUnavailableError(
        `Supabase konnte ${normalizedKey} nicht abrufen.`,
        error instanceof Error ? { cause: error } : undefined,
      );
    }
  }

  async updateItem(key: string, updates: ContentStoreItemUpdate): Promise<void> {
    const normalizedKey = normalizeKey(key);
    try {
      await updateContentItem(normalizedKey, updates);
    } catch (error) {
      throw new ContentStoreUnavailableError(
        `Supabase konnte ${normalizedKey} nicht aktualisieren.`,
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
