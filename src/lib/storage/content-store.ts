import fs from 'node:fs/promises';
import path from 'node:path';
import { del, list as listBlob, put } from '@vercel/blob';

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
  uploadedAt?: Date;
  size?: number;
  contentType?: string;
};

export interface ContentStore {
  getObject(key: string): Promise<ContentStoreObject | null>;
  putObject(key: string, data: Buffer | string, contentType: string): Promise<ContentStorePutResult>;
  deleteObject(key: string, options?: { url?: string }): Promise<void>;
  list(prefix: string): Promise<ContentStoreListItem[]>;
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

  async list(prefix: string): Promise<ContentStoreListItem[]> {
    const normalizedPrefix = normalizeKey(prefix);
    const root = this.localPathForKey(normalizedPrefix);

    const files: ContentStoreListItem[] = [];

    const walk = async (dir: string): Promise<void> => {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          await walk(fullPath);
          continue;
        }

        const stats = await fs.stat(fullPath);
        const relativePath = path.relative(this.localRoot, fullPath).split(path.sep).join('/');
        files.push({
          key: relativePath,
          contentType: null,
          size: stats.size,
          updatedAt: stats.mtime,
        });
      }
    };

    try {
      await walk(root);
      return files;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return [];
      }
      throw new ContentStoreUnavailableError(
        `Lokaler Store konnte Prefix ${normalizedPrefix} nicht auflisten.`,
        error instanceof Error ? { cause: error } : undefined,
      );
    }
  }
}

class VercelBlobContentStore implements ContentStore {
  private readonly token: string;

  constructor(token: string) {
    this.token = token;
  }

  async getObject(key: string): Promise<ContentStoreObject | null> {
    const normalizedKey = normalizeKey(key);
    try {
      const result = await listBlob({ prefix: normalizedKey, token: this.token, limit: 1 });
      const blob = result.blobs.find((entry) => entry.pathname === normalizedKey);
      if (!blob) {
        return null;
      }

      const response = await fetch(blob.url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      return {
        key: normalizedKey,
        data: Buffer.from(arrayBuffer),
        contentType: response.headers.get('content-type'),
      };
    } catch (error) {
      throw new ContentStoreUnavailableError(`Vercel Blob konnte ${normalizedKey} nicht lesen.`, error instanceof Error ? { cause: error } : undefined);
    }
  }

  async putObject(key: string, data: Buffer | string, contentType: string): Promise<ContentStorePutResult> {
    const normalizedKey = normalizeKey(key);
    try {
      const result = await put(normalizedKey, toBuffer(data), {
        token: this.token,
        access: 'public',
        contentType,
        addRandomSuffix: false,
        allowOverwrite: true,
      });
      return {
        key: normalizedKey,
        url: result.url,
        uploadedAt: result.uploadedAt,
        size: result.size,
        contentType: result.contentType,
      };
    } catch (error) {
      throw new ContentStoreUnavailableError(`Vercel Blob konnte ${normalizedKey} nicht schreiben.`, error instanceof Error ? { cause: error } : undefined);
    }
  }

  async deleteObject(key: string, options?: { url?: string }): Promise<void> {
    const normalizedKey = normalizeKey(key);
    try {
      if (options?.url) {
        await del(options.url, { token: this.token });
        return;
      }
      const result = await listBlob({ prefix: normalizedKey, token: this.token, limit: 1 });
      const blob = result.blobs.find((entry) => entry.pathname === normalizedKey);
      if (!blob) {
        return;
      }
      await del(blob.url, { token: this.token });
    } catch (error) {
      throw new ContentStoreUnavailableError(`Vercel Blob konnte ${normalizedKey} nicht löschen.`, error instanceof Error ? { cause: error } : undefined);
    }
  }

  async list(prefix: string): Promise<ContentStoreListItem[]> {
    const normalizedPrefix = normalizeKey(prefix);
    try {
      const result = await listBlob({ token: this.token, prefix: normalizedPrefix });
      return result.blobs.map((blob) => ({
        key: blob.pathname,
        contentType: null,
        size: blob.size,
        updatedAt: blob.uploadedAt,
      }));
    } catch (error) {
      throw new ContentStoreUnavailableError(
        `Vercel Blob konnte Prefix ${normalizedPrefix} nicht auflisten.`,
        error instanceof Error ? { cause: error } : undefined,
      );
    }
  }
}

export function getContentStore(): ContentStore {
  const provider = process.env.CONTENT_STORE_PROVIDER?.trim().toLowerCase() ?? 'vercel-blob';
  const isDevelopment = process.env.NODE_ENV === 'development';
  const allowLocalStoreInProduction = process.env.ALLOW_LOCAL_STORE_IN_PROD?.trim().toLowerCase() === 'true';
  const localRoot = path.join(process.cwd(), process.env.LOCAL_CONTENT_STORE_DIR ?? 'data/content-store');
  const token = process.env.BLOB_READ_WRITE_TOKEN?.trim();

  const getLocalStoreWithWarning = (reason: string): ContentStore => {
    if (!isDevelopment) {
      console.warn(`[content-store] ${reason}`);
    }
    return new LocalContentStore(localRoot);
  };

  if (provider === 'vercel-blob') {
    if (!token) {
      if (isDevelopment) {
        return new LocalContentStore(localRoot);
      }

      if (allowLocalStoreInProduction) {
        return getLocalStoreWithWarning(
          'BLOB_READ_WRITE_TOKEN fehlt, nutze lokalen Fallback, da ALLOW_LOCAL_STORE_IN_PROD=true gesetzt ist.',
        );
      }

      throw new ContentStoreConfigurationError(
        'BLOB_READ_WRITE_TOKEN fehlt für CONTENT_STORE_PROVIDER=vercel-blob. Setze BLOB_READ_WRITE_TOKEN oder ALLOW_LOCAL_STORE_IN_PROD=true für Self-Hosting-Fallback.',
      );
    }
    return new VercelBlobContentStore(token);
  }

  if (provider === 'local') {
    return getLocalStoreWithWarning(
      'CONTENT_STORE_PROVIDER=local ist in Produktion aktiviert. Daten werden ausschließlich lokal gespeichert.',
    );
  }

  throw new ContentStoreConfigurationError(`Unbekannter CONTENT_STORE_PROVIDER: ${provider}`);
}
