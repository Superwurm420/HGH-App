/**
 * Typen für die `content_items` Tabelle in Supabase.
 */

export type ContentCategory = 'timetable' | 'announcement' | 'image' | 'config' | 'other';

export type ContentItemRow = {
  id: string;
  key: string;
  url: string;
  category: ContentCategory;
  content_type: string | null;
  size: number | null;
  created_at: string;
  hash: string | null;
  meta: Record<string, unknown> | null;
  timetable_json: Record<string, unknown> | null;
  timetable_version: string | null;
};

export type ContentItemInsert = {
  key: string;
  url: string;
  category: ContentCategory;
  content_type?: string | null;
  size?: number | null;
  hash?: string | null;
  meta?: Record<string, unknown> | null;
  timetable_json?: Record<string, unknown> | null;
  timetable_version?: string | null;
};
