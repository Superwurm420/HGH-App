# Admin Setup — Cloudflare D1 + R2

## Übersicht

Die App nutzt **Cloudflare** als Backend:
- **D1 (SQLite)** speichert alle strukturierten Daten (Stundenpläne, Ankündigungen, Termine, Sessions, Settings).
- **R2** speichert hochgeladene PDF-Dateien.
- **Cloudflare Worker** (`worker/src/`) stellt die API bereit.

## 1. Cloudflare-Projekt einrichten

1. Erstelle ein Cloudflare-Konto unter https://dash.cloudflare.com
2. Installiere Wrangler: `npm install -g wrangler`
3. Authentifiziere: `wrangler login`

## 2. D1-Datenbank erstellen

```bash
wrangler d1 create hgh-app-db
```

Die Ausgabe enthält eine `database_id`. Trage diese in `wrangler.toml` ein:

```toml
[[d1_databases]]
binding = "DB"
database_name = "hgh-app-db"
database_id = "<deine-database-id>"
```

## 3. Migration anwenden

```bash
# Lokal (für Entwicklung)
npm run db:migrate:local

# Remote (für Produktion)
npm run db:migrate
```

Die Migration (`migrations/0001_initial_schema.sql`) erstellt alle Tabellen:
`users`, `sessions`, `classes`, `timetable_uploads`, `timetable_entries`,
`announcements`, `events`, `media_files`, `app_settings`, `audit_logs`.

## 4. R2-Bucket erstellen

```bash
wrangler r2 bucket create hgh-app-content
```

Der Bucket-Name muss mit `wrangler.toml` übereinstimmen:

```toml
[[r2_buckets]]
binding = "STORAGE"
bucket_name = "hgh-app-content"
```

## 5. Secrets setzen

```bash
wrangler secret put ADMIN_PASSWORD
wrangler secret put SESSION_SECRET
```

`ADMIN_USER` ist als `[vars]` in `wrangler.toml` gesetzt (Default: `redaktion`).

## 6. Deployment

```bash
npm run deploy
```

## 7. Erster Login

Beim ersten Login mit `ADMIN_USER` + `ADMIN_PASSWORD` wird automatisch
ein Admin-User in der D1-Datenbank angelegt (Auto-Setup).

## Lokale Entwicklung

```bash
# Terminal 1: Worker starten (D1 + R2 lokal)
npm run dev:worker

# Terminal 2: Next.js Frontend starten
npm run dev
```

Next.js proxied `/api/*` automatisch an `http://localhost:8787`.

## Operationen

### Schüler-UI (lesend)
1. **`/api/bootstrap`** → Aktiver Stundenplan + Ankündigungen (ETag-basiert)
2. **`/api/timetable?klasse=HT11`** → Stundenplan für eine Klasse
3. **`/api/announcements`** → Aktive Ankündigungen
4. **`/api/settings`** → Öffentliche Einstellungen (Kalender-URLs, Meldungen, Ferien)

### Admin-UI (schreibend)
1. **PDF-Upload**: Datei → R2 + D1 `timetable_uploads` → Automatisches Parsing → D1 `timetable_entries`
2. **Aktivierung**: Upload als aktiven Stundenplan setzen
3. **Ankündigungen/Termine**: CRUD direkt in D1
4. **Settings**: Key-Value-Paare in D1 `app_settings`

Alle Admin-Aktionen werden im `audit_logs`-Table protokolliert.
