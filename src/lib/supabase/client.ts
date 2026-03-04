import { createClient, SupabaseClient } from '@supabase/supabase-js';

let serverClient: SupabaseClient | null = null;

export class SupabaseConfigurationError extends Error {
  variableName: string;

  constructor(variableName: string) {
    super(`Fehlende oder leere Umgebungsvariable: ${variableName}`);
    this.name = 'SupabaseConfigurationError';
    this.variableName = variableName;
  }
}

function getRequiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new SupabaseConfigurationError(name);
  }
  return value;
}

/**
 * Supabase-Client mit Service-Role-Key für serverseitige Operationen
 * (Storage-Upload, DB-Schreibzugriffe).
 *
 * Wird als Singleton gecached, da Next.js API-Routes im selben Prozess laufen.
 */
export function getSupabaseAdmin(): SupabaseClient {
  if (serverClient) return serverClient;

  const url = getRequiredEnv('SUPABASE_URL');
  const serviceKey = getRequiredEnv('SUPABASE_SERVICE_ROLE_KEY');

  serverClient = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  return serverClient;
}

/**
 * Public Supabase URL für Storage-Downloads (lesend, kein Key im Client-Bundle).
 */
export function getSupabasePublicUrl(): string {
  return getRequiredEnv('SUPABASE_URL');
}

const CONTENT_BUCKET = 'content';

/**
 * Erzeugt die öffentliche URL für ein Storage-Objekt im `content`-Bucket.
 */
export function buildPublicStorageUrl(key: string): string {
  const base = getSupabasePublicUrl().replace(/\/+$/, '');
  return `${base}/storage/v1/object/public/${CONTENT_BUCKET}/${key}`;
}

export { CONTENT_BUCKET };
