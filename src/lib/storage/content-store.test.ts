import { afterEach, describe, expect, it, vi } from 'vitest';
import { ContentStoreConfigurationError, getContentStore } from './content-store';

const originalEnv = {
  NODE_ENV: process.env.NODE_ENV,
  CONTENT_STORE_PROVIDER: process.env.CONTENT_STORE_PROVIDER,
  BLOB_READ_WRITE_TOKEN: process.env.BLOB_READ_WRITE_TOKEN,
  ALLOW_LOCAL_STORE_IN_PROD: process.env.ALLOW_LOCAL_STORE_IN_PROD,
};

afterEach(() => {
  process.env.NODE_ENV = originalEnv.NODE_ENV;
  process.env.CONTENT_STORE_PROVIDER = originalEnv.CONTENT_STORE_PROVIDER;
  process.env.BLOB_READ_WRITE_TOKEN = originalEnv.BLOB_READ_WRITE_TOKEN;
  process.env.ALLOW_LOCAL_STORE_IN_PROD = originalEnv.ALLOW_LOCAL_STORE_IN_PROD;
  vi.restoreAllMocks();
});

describe('getContentStore configuration', () => {
  it('throws a detailed configuration error for vercel-blob without token in production', () => {
    process.env.NODE_ENV = 'production';
    process.env.CONTENT_STORE_PROVIDER = 'vercel-blob';
    delete process.env.BLOB_READ_WRITE_TOKEN;
    delete process.env.ALLOW_LOCAL_STORE_IN_PROD;

    expect(() => getContentStore()).toThrowError(ContentStoreConfigurationError);
    expect(() => getContentStore()).toThrowError(/BLOB_READ_WRITE_TOKEN/);
    expect(() => getContentStore()).toThrowError(/ALLOW_LOCAL_STORE_IN_PROD=true/);
  });

  it('uses local fallback in production when explicitly enabled', async () => {
    process.env.NODE_ENV = 'production';
    process.env.CONTENT_STORE_PROVIDER = 'vercel-blob';
    delete process.env.BLOB_READ_WRITE_TOKEN;
    process.env.ALLOW_LOCAL_STORE_IN_PROD = 'true';

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    const store = getContentStore();
    await expect(store.list('health/')).resolves.toEqual([]);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('ALLOW_LOCAL_STORE_IN_PROD=true'),
    );
  });
});
