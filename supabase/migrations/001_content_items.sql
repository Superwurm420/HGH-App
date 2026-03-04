-- Migration: Erstelle content_items Tabelle
-- Zentrale Index-Tabelle für alle Content-Objekte im Supabase Storage.

create table if not exists content_items (
  id              uuid primary key default gen_random_uuid(),
  key             text unique not null,
  url             text not null,
  category        text not null check (category in ('timetable', 'announcement', 'image', 'config', 'other')),
  content_type    text,
  size            int,
  created_at      timestamptz not null default now(),
  hash            text,
  meta            jsonb,
  timetable_json  jsonb,
  timetable_version text
);

-- Index für schnelles Filtern nach Kategorie
create index if not exists idx_content_items_category on content_items (category);

-- Index für Sortierung nach Erstelldatum
create index if not exists idx_content_items_created_at on content_items (created_at desc);

-- Supabase Storage Bucket erstellen (public, damit URLs ohne Auth abrufbar sind)
-- Hinweis: Bucket muss manuell oder per Supabase Dashboard erstellt werden.
-- Name: "content", public: true
--
-- Alternativ per SQL (nur wenn die storage-Extension aktiv ist):
-- insert into storage.buckets (id, name, public)
-- values ('content', 'content', true)
-- on conflict (id) do nothing;
