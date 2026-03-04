import { getSupabaseAdmin, CONTENT_BUCKET, buildPublicStorageUrl } from './client';
import type { ContentCategory, ContentItemInsert, ContentItemRow } from './db-types';

export class SupabaseContentError extends Error {
  readonly reason: string;
  constructor(reason: string, options?: ErrorOptions) {
    super(`Supabase-Fehler: ${reason}`, options);
    this.name = 'SupabaseContentError';
    this.reason = reason;
  }
}

// ---------------------------------------------------------------------------
// Storage helpers (Supabase Storage – nur für Admin-Operationen)
// ---------------------------------------------------------------------------

export async function uploadToStorage(
  key: string,
  data: Buffer | Uint8Array,
  contentType: string,
): Promise<string> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.storage
    .from(CONTENT_BUCKET)
    .upload(key, data, { contentType, upsert: true });

  if (error) {
    throw new SupabaseContentError(`Upload fehlgeschlagen für ${key}: ${error.message}`, { cause: error });
  }

  return buildPublicStorageUrl(key);
}

export async function deleteFromStorage(key: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.storage.from(CONTENT_BUCKET).remove([key]);

  if (error) {
    throw new SupabaseContentError(`Löschen fehlgeschlagen für ${key}: ${error.message}`, { cause: error });
  }
}

export async function downloadFromStorage(key: string): Promise<{ data: Buffer; contentType: string | null } | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.storage.from(CONTENT_BUCKET).download(key);

  if (error) {
    if (error.message?.includes('not found') || error.message?.includes('Object not found')) {
      return null;
    }
    throw new SupabaseContentError(`Download fehlgeschlagen für ${key}: ${error.message}`, { cause: error });
  }

  if (!data) return null;

  const arrayBuffer = await data.arrayBuffer();
  return {
    data: Buffer.from(arrayBuffer),
    contentType: data.type || null,
  };
}

// ---------------------------------------------------------------------------
// DB helpers (content_items – Quelle der Wahrheit)
// ---------------------------------------------------------------------------

export async function insertContentItem(item: ContentItemInsert): Promise<ContentItemRow> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('content_items')
    .upsert(item, { onConflict: 'key' })
    .select()
    .single();

  if (error) {
    throw new SupabaseContentError(`Insert/Upsert fehlgeschlagen: ${error.message}`, { cause: error });
  }

  return data as ContentItemRow;
}

export async function deleteContentItem(key: string): Promise<boolean> {
  const supabase = getSupabaseAdmin();
  const { error, count } = await supabase
    .from('content_items')
    .delete({ count: 'exact' })
    .eq('key', key);

  if (error) {
    throw new SupabaseContentError(`Löschen fehlgeschlagen: ${error.message}`, { cause: error });
  }

  return (count ?? 0) > 0;
}

export async function listContentItems(category?: ContentCategory): Promise<ContentItemRow[]> {
  const supabase = getSupabaseAdmin();
  let query = supabase
    .from('content_items')
    .select('*')
    .order('created_at', { ascending: false });

  if (category) {
    query = query.eq('category', category);
  }

  const { data, error } = await query;

  if (error) {
    throw new SupabaseContentError(`Abfrage fehlgeschlagen: ${error.message}`, { cause: error });
  }

  return (data ?? []) as ContentItemRow[];
}

export async function getContentItem(key: string): Promise<ContentItemRow | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('content_items')
    .select('*')
    .eq('key', key)
    .maybeSingle();

  if (error) {
    throw new SupabaseContentError(`Abfrage fehlgeschlagen: ${error.message}`, { cause: error });
  }

  return (data as ContentItemRow) ?? null;
}

export async function updateContentItem(
  key: string,
  updates: Partial<Omit<ContentItemInsert, 'key'>>,
): Promise<ContentItemRow | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('content_items')
    .update(updates)
    .eq('key', key)
    .select()
    .single();

  if (error) {
    throw new SupabaseContentError(`Update fehlgeschlagen: ${error.message}`, { cause: error });
  }

  return (data as ContentItemRow) ?? null;
}

// ---------------------------------------------------------------------------
// Kombinierte Operationen (Storage + DB)
// ---------------------------------------------------------------------------

function detectCategory(key: string, contentType: string): ContentCategory {
  if (key.startsWith('timetables/') || contentType === 'application/pdf') return 'timetable';
  if (key.startsWith('announcements/')) return 'announcement';
  if (key.startsWith('images/') || contentType.startsWith('image/')) return 'image';
  if (contentType === 'application/json' || key.endsWith('.json')) return 'config';
  return 'other';
}

/**
 * Upload: Datei in Storage hochladen + Index-Eintrag in DB erstellen/aktualisieren.
 */
export async function uploadContent(params: {
  key: string;
  data: Buffer | Uint8Array;
  contentType: string;
  category?: ContentCategory;
  meta?: Record<string, unknown>;
}): Promise<ContentItemRow> {
  const { key, data, contentType, meta } = params;
  const category = params.category ?? detectCategory(key, contentType);

  const url = await uploadToStorage(key, data, contentType);

  return insertContentItem({
    key,
    url,
    category,
    content_type: contentType,
    size: data.byteLength,
    meta: meta ?? null,
  });
}

/**
 * Delete: Datei aus Storage löschen + Index-Eintrag aus DB entfernen.
 */
export async function deleteContent(key: string): Promise<boolean> {
  await deleteFromStorage(key).catch((error) => {
    console.warn(`[supabase] Storage-Löschung für ${key} fehlgeschlagen, fahre mit DB-Bereinigung fort.`, error);
  });

  return deleteContentItem(key);
}

/**
 * Liest ein Config-Objekt (JSON) aus dem Storage.
 * Verwendet für Announcements/Calendar/Messages/Holidays.
 */
export async function getConfigObject<T = unknown>(key: string): Promise<T | null> {
  const result = await downloadFromStorage(key);
  if (!result) return null;

  try {
    return JSON.parse(result.data.toString('utf8')) as T;
  } catch {
    console.warn(`[supabase] Konnte ${key} nicht als JSON parsen.`);
    return null;
  }
}

/**
 * Speichert ein Config-Objekt (JSON) in Storage + aktualisiert DB-Index.
 */
export async function putConfigObject(
  key: string,
  data: unknown,
  category: ContentCategory = 'config',
): Promise<ContentItemRow> {
  const payload = Buffer.from(JSON.stringify(data, null, 2) + '\n', 'utf8');
  return uploadContent({
    key,
    data: payload,
    contentType: 'application/json; charset=utf-8',
    category,
  });
}
