import { afterEach, describe, expect, it, vi } from 'vitest';
import { ContentStoreConfigurationError, getContentStore } from './content-store';

const originalEnv = {
  NODE_ENV: process.env.NODE_ENV,
  CONTENT_STORE_PROVIDER: process.env.CONTENT_STORE_PROVIDER,
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
};

afterEach(() => {
  process.env.NODE_ENV = originalEnv.NODE_ENV;
  process.env.CONTENT_STORE_PROVIDER = originalEnv.CONTENT_STORE_PROVIDER;
  process.env.SUPABASE_URL = originalEnv.SUPABASE_URL;
  process.env.SUPABASE_SERVICE_ROLE_KEY = originalEnv.SUPABASE_SERVICE_ROLE_KEY;
  vi.restoreAllMocks();
});

describe('getContentStore configuration', () => {
  it('throws a configuration error when Supabase env vars are missing in production', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.CONTENT_STORE_PROVIDER;
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    expect(() => getContentStore()).toThrowError(ContentStoreConfigurationError);
    expect(() => getContentStore()).toThrowError(/SUPABASE_URL/);
  });

  it('uses local fallback in development when Supabase env vars are missing', () => {
    process.env.NODE_ENV = 'development';
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    const store = getContentStore();
    expect(store).toBeDefined();
  });

  it('uses local fallback when CONTENT_STORE_PROVIDER=local', () => {
    process.env.NODE_ENV = 'production';
    process.env.CONTENT_STORE_PROVIDER = 'local';

    const store = getContentStore();
    expect(store).toBeDefined();
  });
});
