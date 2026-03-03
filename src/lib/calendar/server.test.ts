import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
  vi.resetModules();
  vi.restoreAllMocks();
  delete process.env.CONTENT_STORE_MIGRATE_ON_FALLBACK;
});

describe('getCalendarUrls fallback handling', () => {
  it('loads URLs from public/content/kalender.txt when store objects are missing', async () => {
    const getObject = vi.fn().mockResolvedValue(null);
    const putObject = vi.fn();

    vi.doMock('../storage/content-store', () => ({
      getContentStore: () => ({ getObject, putObject }),
    }));

    vi.doMock('node:fs/promises', () => ({
      default: {
        readFile: vi.fn().mockResolvedValue('not-a-url\nhttps://example.com/a\nhttp://example.com/b\n'),
      },
    }));

    const { getCalendarUrls } = await import('./server');
    await expect(getCalendarUrls()).resolves.toEqual(['https://example.com/a', 'http://example.com/b']);
    expect(putObject).not.toHaveBeenCalled();
  });

  it('migrates fallback URLs into store when migration flag is enabled', async () => {
    process.env.CONTENT_STORE_MIGRATE_ON_FALLBACK = 'true';

    const getObject = vi.fn().mockResolvedValue(null);
    const putObject = vi.fn().mockResolvedValue(undefined);

    vi.doMock('../storage/content-store', () => ({
      getContentStore: () => ({ getObject, putObject }),
    }));

    vi.doMock('node:fs/promises', () => ({
      default: {
        readFile: vi.fn().mockResolvedValue('https://example.com/calendar\n'),
      },
    }));

    const { getCalendarUrls } = await import('./server');
    await expect(getCalendarUrls()).resolves.toEqual(['https://example.com/calendar']);
    expect(putObject).toHaveBeenCalledTimes(1);
  });
});
