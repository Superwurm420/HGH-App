import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
  vi.resetModules();
  vi.restoreAllMocks();
  delete process.env.CONTENT_STORE_MIGRATE_ON_FALLBACK;
});

describe('getMessages fallback handling', () => {
  it('loads and validates messages from public/content/messages.json when store object is missing', async () => {
    const getObject = vi.fn().mockResolvedValue(null);
    const putObject = vi.fn();

    vi.doMock('../storage/content-store', () => ({
      getContentStore: () => ({ getObject, putObject }),
    }));

    vi.doMock('node:fs/promises', () => ({
      default: {
        readFile: vi.fn().mockResolvedValue(JSON.stringify({ standard: { vorUnterricht: ['Hi'] } })),
      },
    }));

    const { getMessages } = await import('./server');
    await expect(getMessages()).resolves.toEqual({ standard: { vorUnterricht: ['Hi'] } });
    expect(putObject).not.toHaveBeenCalled();
  });

  it('returns safe default when both store and fallback file are invalid', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    vi.doMock('../storage/content-store', () => ({
      getContentStore: () => ({
        getObject: vi.fn().mockResolvedValue({
          data: Buffer.from('{"standard": []}', 'utf8'),
        }),
        putObject: vi.fn(),
      }),
    }));

    vi.doMock('node:fs/promises', () => ({
      default: {
        readFile: vi.fn().mockResolvedValue('{"standard": []}'),
      },
    }));

    const { getMessages } = await import('./server');
    await expect(getMessages()).resolves.toEqual({ standard: {} });
    expect(warnSpy).toHaveBeenCalled();
  });
});
