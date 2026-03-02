import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterEach, describe, expect, it, vi } from 'vitest';

const originalCwd = process.cwd();

async function loadRepositoryModule() {
  const modulePath = path.resolve(originalCwd, 'src/lib/announcements/repository.ts');
  const moduleUrl = `${pathToFileURL(modulePath).href}?v=${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
  return import(moduleUrl);
}

function setupTempCwd(): string {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'announcements-repository-'));
  process.chdir(tempDir);
  return tempDir;
}

afterEach(() => {
  process.chdir(originalCwd);
  vi.restoreAllMocks();
});

describe('readStore integration via listAnnouncementRecords', () => {
  it('returns an empty list when store file does not exist', async () => {
    const tempDir = setupTempCwd();
    const repository = await loadRepositoryModule();

    expect(repository.listAnnouncementRecords()).toEqual([]);
    expect(fs.existsSync(path.join(tempDir, 'data', 'announcements-store.json'))).toBe(false);
  });

  it('throws AnnouncementStoreReadError and quarantines broken json', async () => {
    const tempDir = setupTempCwd();
    const storeDir = path.join(tempDir, 'data');
    fs.mkdirSync(storeDir, { recursive: true });

    const storeFile = path.join(storeDir, 'announcements-store.json');
    fs.writeFileSync(storeFile, '{ invalid json', 'utf8');

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const repository = await loadRepositoryModule();

    expect(() => repository.listAnnouncementRecords()).toThrowError(repository.AnnouncementStoreReadError);
    expect(fs.existsSync(storeFile)).toBe(false);

    const quarantinedFiles = fs.readdirSync(storeDir).filter((entry) => entry.startsWith('announcements-store.json.broken-'));
    expect(quarantinedFiles).toHaveLength(1);
    expect(consoleSpy).toHaveBeenCalled();
  });

  it('throws AnnouncementStoreReadError for invalid schema payload', async () => {
    setupTempCwd();
    fs.mkdirSync(path.join(process.cwd(), 'data'), { recursive: true });
    fs.writeFileSync(
      path.join(process.cwd(), 'data', 'announcements-store.json'),
      JSON.stringify({ version: 2, announcements: [] }),
      'utf8',
    );

    const repository = await loadRepositoryModule();

    expect(() => repository.listAnnouncementRecords()).toThrowError(repository.AnnouncementStoreReadError);
  });
});
