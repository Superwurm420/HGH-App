import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterEach, describe, expect, it, vi } from 'vitest';

const originalCwd = process.cwd();
const originalNodeEnv = process.env.NODE_ENV;
const originalProvider = process.env.CONTENT_STORE_PROVIDER;
const originalSupabaseUrl = process.env.SUPABASE_URL;
const originalSupabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function loadRepositoryModule() {
  const modulePath = path.resolve(originalCwd, 'src/lib/announcements/repository.ts');
  const moduleUrl = `${pathToFileURL(modulePath).href}?v=${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
  return import(moduleUrl);
}

function setupTempCwd(): string {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'announcements-repository-'));
  process.chdir(tempDir);
  process.env.NODE_ENV = 'development';
  process.env.CONTENT_STORE_PROVIDER = 'local';
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  return tempDir;
}

afterEach(() => {
  process.chdir(originalCwd);
  process.env.NODE_ENV = originalNodeEnv;
  process.env.CONTENT_STORE_PROVIDER = originalProvider;
  process.env.SUPABASE_URL = originalSupabaseUrl;
  process.env.SUPABASE_SERVICE_ROLE_KEY = originalSupabaseKey;
  vi.restoreAllMocks();
});

describe('readStore integration via listAnnouncementRecords', () => {
  it('returns an empty list when store object does not exist', async () => {
    setupTempCwd();
    const repository = await loadRepositoryModule();

    await expect(repository.listAnnouncementRecords()).resolves.toEqual([]);
  });

  it('throws AnnouncementStoreReadError for invalid schema payload', async () => {
    const tempDir = setupTempCwd();
    const storePath = path.join(tempDir, 'data/content-store/announcements/store.json');
    fs.mkdirSync(path.dirname(storePath), { recursive: true });
    fs.writeFileSync(storePath, JSON.stringify({ version: 2, announcements: [] }), 'utf8');

    const repository = await loadRepositoryModule();

    await expect(repository.listAnnouncementRecords()).rejects.toThrowError(repository.AnnouncementStoreReadError);
  });

  it('writes and reads entries using local development fallback', async () => {
    setupTempCwd();
    const repository = await loadRepositoryModule();

    await repository.upsertAnnouncementRecord(
      repository.toRecord(
        {
          title: 'Test Termin',
          date: '10.10.2026 10:00',
          audience: 'alle',
          classes: '11A',
          expires: '10.10.2026 12:00',
          anzeige: 'ja',
          body: 'Details',
        },
        'test-termin',
      ),
    );

    const entries = await repository.listAnnouncementRecords();
    expect(entries).toHaveLength(1);
    expect(entries[0]?.id).toBe('test-termin');
    expect(entries[0]?.title).toBe('Test Termin');
  });

  it('fails in production without Supabase config', async () => {
    setupTempCwd();
    process.env.NODE_ENV = 'production';
    delete process.env.CONTENT_STORE_PROVIDER;

    const repository = await loadRepositoryModule();
    await expect(repository.listAnnouncementRecords()).rejects.toThrowError(/SUPABASE_URL/);
  });
});
