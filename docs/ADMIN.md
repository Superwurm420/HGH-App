# Admin Setup — Supabase Content-System

## Übersicht

Die App nutzt **Supabase** als Content-Backend:
- **Supabase Storage** (Bucket: `content`, public) speichert Dateien (PDFs, JSON).
- **Supabase Postgres** (Tabelle: `content_items`) dient als Index / Quelle der Wahrheit.

Die Schüler-UI macht **keine** Storage-`list()`- oder `head()`-Aufrufe.
Stattdessen liest sie ausschließlich aus `content_items` (DB-Query) und nutzt die
dort gespeicherten URLs, um Dateien direkt abzurufen.

## 1. Supabase-Projekt einrichten

1. Erstelle ein Supabase-Projekt unter https://supabase.com/dashboard
2. Notiere:
   - **Project URL** → `SUPABASE_URL`
   - **anon/public key** → `SUPABASE_ANON_KEY`
   - **service_role key** → `SUPABASE_SERVICE_ROLE_KEY`

## 2. Datenbank-Migration

Führe die SQL-Migration im Supabase SQL-Editor aus:

```sql
-- Datei: supabase/migrations/001_content_items.sql

create table if not exists content_items (
  id              uuid primary key default gen_random_uuid(),
  key             text unique not null,
  url             text not null,
  category        text not null check (category in ('timetable','announcement','image','config','other')),
  content_type    text,
  size            int,
  created_at      timestamptz not null default now(),
  hash            text,
  meta            jsonb,
  timetable_json  jsonb,
  timetable_version text
);

create index if not exists idx_content_items_category on content_items (category);
create index if not exists idx_content_items_created_at on content_items (created_at desc);
```

## 3. Storage-Bucket erstellen

Im Supabase Dashboard → Storage → „New Bucket":
- **Name**: `content`
- **Public**: ✅ (damit URLs ohne Auth abrufbar sind)

Alternativ per SQL:
```sql
insert into storage.buckets (id, name, public)
values ('content', 'content', true)
on conflict (id) do nothing;
```

## 4. Umgebungsvariablen setzen

In `.env` (lokal) oder im Hosting-Dashboard (Vercel, etc.):

```bash
SUPABASE_URL=https://xyz.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

ADMIN_USER=redaktion
ADMIN_PASSWORD=<sicheres-passwort>
SESSION_SECRET=<langes-zufaelliges-secret>
```

**Wichtig**: `SUPABASE_SERVICE_ROLE_KEY` wird nur serverseitig genutzt und
darf niemals ins Client-Bundle gelangen. Next.js stellt sicher, dass env vars
ohne `NEXT_PUBLIC_`-Prefix nur serverseitig verfügbar sind.

## 5. Lokale Entwicklung ohne Supabase

Für lokale Entwicklung kann Supabase umgangen werden:

```bash
CONTENT_STORE_PROVIDER=local
LOCAL_CONTENT_STORE_DIR=data/content-store
```

In diesem Modus werden Dateien im lokalen Dateisystem gespeichert.
Der Supabase-DB-Index wird nicht genutzt.

## Operationen bei normaler Nutzung

### Schüler-UI (lesend)
1. **`/api/content-index`** → `SELECT * FROM content_items ORDER BY created_at DESC`
   - Ein einziger DB-Read, gecached (s-maxage=60, stale-while-revalidate=600)
2. **Dateiabruf** → Direkte HTTP-Requests an die in `content_items.url` gespeicherten
   öffentlichen Supabase-Storage-URLs (CDN-cached, kein API-Call)
3. **Kein `list()`, kein `head()`**, keine Storage-Scans

### Admin-UI (schreibend)
1. **Upload**: Datei → Supabase Storage `upload()` + `INSERT INTO content_items`
2. **Delete**: `DELETE FROM content_items` + Supabase Storage `remove()`
3. **Config-Updates** (Kalender, Meldungen, Ferien, Ankündigungen):
   JSON → Supabase Storage `upload()` + `UPSERT INTO content_items`

### Warum das stabil ist
- **Keine teuren Operationen**: Die UI macht nur DB-Reads (billig, schnell) und
  direkte File-Downloads über public URLs (CDN-cached).
- **Kein Scanning**: Storage `list()`/`head()` werden nur bei Admin-Uploads genutzt,
  nicht bei normalen Seitenaufrufen.
- **Supabase Free Tier**: DB-Queries und Storage-Downloads aus dem public Bucket
  verbrauchen keine „Advanced Ops".
