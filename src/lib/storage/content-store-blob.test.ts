import { afterEach, describe, expect, it, vi } from 'vitest';

const putMock = vi.fn();
const delMock = vi.fn();
const listMock = vi.fn();

vi.mock('@vercel/blob', () => ({
  put: putMock,
  del: delMock,
  list: listMock,
}));

const originalEnv = {
  NODE_ENV: process.env.NODE_ENV,
  CONTENT_STORE_PROVIDER: process.env.CONTENT_STORE_PROVIDER,
  BLOB_READ_WRITE_TOKEN: process.env.BLOB_READ_WRITE_TOKEN,
};

afterEach(() => {
  process.env.NODE_ENV = originalEnv.NODE_ENV;
  process.env.CONTENT_STORE_PROVIDER = originalEnv.CONTENT_STORE_PROVIDER;
  process.env.BLOB_READ_WRITE_TOKEN = originalEnv.BLOB_READ_WRITE_TOKEN;
  vi.clearAllMocks();
});

describe('VercelBlobContentStore behavior', () => {
  it('writes stable blob pathnames without random suffixes', async () => {
    process.env.CONTENT_STORE_PROVIDER = 'vercel-blob';
    process.env.BLOB_READ_WRITE_TOKEN = 'token';

    const { getContentStore } = await import('./content-store');

    const store = getContentStore();
    await store.putObject('announcements/store.json', '{"ok":true}', 'application/json');

    expect(putMock).toHaveBeenCalledTimes(1);
    expect(putMock).toHaveBeenCalledWith(
      'announcements/store.json',
      expect.any(Buffer),
      expect.objectContaining({
        addRandomSuffix: false,
        allowOverwrite: true,
        access: 'public',
      }),
    );
  });

  it('deletes via blob URL looked up by exact pathname', async () => {
    process.env.CONTENT_STORE_PROVIDER = 'vercel-blob';
    process.env.BLOB_READ_WRITE_TOKEN = 'token';

    listMock.mockResolvedValue({
      blobs: [
        {
          pathname: 'timetables/Stundenplan_kw_10_Hj2_2024_25.pdf',
          url: 'https://blob.vercel-storage.com/timetables/Stundenplan_kw_10_Hj2_2024_25.pdf',
        },
      ],
    });

    const { getContentStore } = await import('./content-store');

    const store = getContentStore();
    await store.deleteObject('timetables/Stundenplan_kw_10_Hj2_2024_25.pdf');

    expect(listMock).toHaveBeenCalledWith(
      expect.objectContaining({
        prefix: 'timetables/Stundenplan_kw_10_Hj2_2024_25.pdf',
        limit: 1,
      }),
    );
    expect(delMock).toHaveBeenCalledWith(
      'https://blob.vercel-storage.com/timetables/Stundenplan_kw_10_Hj2_2024_25.pdf',
      expect.objectContaining({ token: 'token' }),
    );
  });
});
