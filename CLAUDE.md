# CLAUDE.md — HGH-App

## Project Overview

HGH-App is a **Progressive Web App (PWA)** for the **Holztechnik und Gestaltung Hildesheim** vocational school (BBS). It displays weekly timetables parsed from PDF files, school announcements, a calendar, daily messages, and a countdown timer. The entire UI is in **German**.

- **Runtime**: One Cloudflare Worker serving both the UI and the API (via OpenNext)
- **Framework**: Next.js 16 (App Router) with React 18
- **Database**: Cloudflare D1 (SQLite)
- **File Storage**: Cloudflare R2
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS + CSS Modules (`.module.css`) + custom CSS tokens
- **Dark mode**: class-based (`darkMode: 'class'` in Tailwind config)
- **Testing**: Vitest
- **Linting**: ESLint with `next/core-web-vitals` and `next/typescript`

## Quick Reference — Commands

```bash
npm run setup            # Lokale Ersteinrichtung (lokale D1-Migration)
npm run dev              # Dev-Server inkl. D1/R2 über Miniflare (Port 3000)
npm run build            # Production-Build (OpenNext/Cloudflare)
npm run preview          # Gebauten Worker lokal ausführen
npm run lint             # ESLint
npm run typecheck        # TypeScript
npm run test:unit        # Unit-Tests (Vitest)
npm run db:migrate       # D1-Migrationen anwenden (Produktion)
npm run db:migrate:local # D1-Migrationen anwenden (lokal)
npm run deploy           # Deploy nach Cloudflare
npm run setup:cloudflare # Cloudflare-Ersteinrichtung (D1, R2, Migration)
```

## Repository Structure

```
├── CLAUDE.md
├── wrangler.toml              # Worker-Konfiguration: Assets, D1, R2, ADMIN_USER
├── next.config.mjs            # Favicon-Rewrites, Caching-Header, Dev-Bindings
├── open-next.config.ts
├── tailwind.config.ts
├── tsconfig.json              # Strict TS, Pfad-Alias @/* → ./src/*
│
├── migrations/
│   └── 0001_initial_schema.sql
│
├── scripts/
│   ├── setup.mjs              # Ersteinrichtung lokal / auf Cloudflare
│   ├── prebuild.mjs           # erzeugt public/sw.js + public/pdfjs/
│   └── sw.template.js         # Service-Worker-Vorlage (__BUILD_VERSION__)
│
├── public/
│   ├── content/branding/      # Logo, Favicons, PWA-Icons
│   ├── manifest.webmanifest
│   ├── sw.js                  # generiert — nicht bearbeiten, nicht eingecheckt
│   └── pdfjs/                 # generiert — pdfjs für den Browser-Parser
│
└── src/
    ├── app/                   # Next.js App Router
    │   ├── page.tsx           # Startseite
    │   ├── layout.tsx
    │   ├── stundenplan/ woche/ pinnwand/ weiteres/ tv/
    │   ├── admin/
    │   │   ├── page.tsx
    │   │   └── ui/            # AdminWorkspace + Tabs (Upload, Ankündigungen,
    │   │                      #   Termine, Bilder, Einstellungen)
    │   └── api/               # ── die komplette API ──
    │       ├── bootstrap/ timetable/ announcements/ events/ settings/ media/
    │       └── admin/         # login, logout, session, setup-status,
    │                          #   announcements, events, uploads, media,
    │                          #   settings, audit
    │
    ├── server/                # Serverseitige Logik (nur im Worker)
    │   ├── env.ts             # Bindings über getCloudflareContext()
    │   ├── types.ts           # CloudflareEnv, DB-Zeilen; Stundenplan-Typen
    │   │                      #   re-exportiert aus lib/timetable/types
    │   ├── auth.ts            # Session-Cookie, requireAuth, Ersteinrichtung
    │   ├── guard.ts           # withAdmin() — Bindings + Auth + Fehlerbehandlung
    │   ├── responses.ts       # jsonResponse, errorResponse, withErrorHandling
    │   ├── page-data.ts       # Datenbeschaffung der Server Components
    │   └── services/          # timetable, schedule, announcements, events,
    │                          #   settings, media, password, audit
    │
    ├── components/
    │   ├── announcements/ schedule/ tv/ ui/
    │
    ├── lib/
    │   ├── api/client.ts      # API-Client — nur Adminbereich (Browser)
    │   ├── admin-defaults.ts  # Standardzugang für die Ersteinrichtung
    │   ├── base64.ts          # Kodierung für Uploads (Browser-Hälfte)
    │   ├── berlin-time.ts     # einzige Quelle für Zeit-/Datumslogik
    │   ├── timetable/         # types, parse-pdf, parse-pdf-browser, select-class
    │   ├── calendar/          # Feiertage/Ferien, Google-Kalender-URLs
    │   └── storage/preferences.ts
    │
    └── styles/                # globals, tokens, base, components, layout,
                               #   features-timetable
```

## Architecture & Key Patterns

### Ein Worker, eine Origin

UI und API laufen im **selben** Cloudflare-Worker. Die API besteht aus Next.js Route Handlers unter `src/app/api/`; D1 und R2 kommen über `getCloudflareContext()` aus `@opennextjs/cloudflare` (gekapselt in `src/server/env.ts`).

Daraus folgt:

- **Kein CORS**, keine `Access-Control-*`-Header, keine Cookie-Sonderfälle.
- **Keine API-URL zu konfigurieren** — es gibt weder `API_ORIGIN` noch `NEXT_PUBLIC_API_URL`.
- Ein Deploy (`npm run deploy`), eine `wrangler.toml`.

### Server Components lesen direkt aus D1

Die öffentlichen Seiten rufen **nicht** die eigene HTTP-API auf, sondern die Service-Funktionen in `src/server/services/` — gebündelt über `src/server/page-data.ts`.

Das ist kein Stilfrage, sondern notwendig: Ein `fetch('/api/…')` mit relativer URL kann serverseitig nicht aufgelöst werden und wirft. Genau daran lag es, dass die Seiten dauerhaft „Kein Stundenplan verfügbar" anzeigten.

`src/lib/api/client.ts` ist deshalb ausschließlich für den Adminbereich da (läuft im Browser).

### Data Flow

- **Stundenplan**: Admin wählt PDF → **Auswertung im Browser** (`parse-pdf-browser.ts`) → Vorschau → PDF + JSON an `POST /api/admin/uploads` → Server validiert (`services/schedule.ts`) → `timetable_entries` in D1, PDF in R2 → Aktivieren.
- **Anzeige**: Server Components lesen den aktiven Upload aus D1. Fällt zurück auf den zuletzt geparsten/archivierten Plan, wenn keiner aktiviert wurde.
- **Ankündigungen/Termine/Einstellungen**: D1, gepflegt über den Adminbereich.
- **Bilder**: R2 + `media_files`, ausgeliefert über `GET /api/media/:id` (Bucket bleibt privat).
- **Klassenauswahl**: `localStorage` im Client, per `?klasse=` in der URL gespiegelt.

### PDF-Parsing läuft im Browser

Der Workers-Free-Plan erlaubt **10 ms CPU-Zeit pro Request** — das Auswerten eines Stundenplan-PDFs liegt weit darüber. Deshalb:

- `src/lib/timetable/parse-pdf.ts` ist der reine Parser; `getDocument` wird injiziert (dadurch ohne echtes PDF testbar).
- `parse-pdf-browser.ts` lädt pdfjs **zur Laufzeit** aus `public/pdfjs/` (Import über eine Variable, damit kein Bundler die 1,5 MB einbaut) und ruft den Parser auf.
- Der Server parst nichts, **validiert aber vollständig** (`validateSchedule`): Klassencode-Muster, Wochentage, Stundennummern, Textlängen, Mengen.

**Dateinamen-Konvention**: `Stundenplan_kw_XX_HjY_YYYY_YY.pdf` (KW, Halbjahr, Schuljahr).

**Bekannte Einschränkung**: Der Parser wertet nur Seite 1 des PDFs aus.

### Admin System

- Passwort-Anmeldung (PBKDF2-SHA256), Session-Token in D1, 12 Stunden gültig.
- **Ersteinrichtung ohne Secret**: Solange die `users`-Tabelle leer ist, legt der
  erste Login mit `ADMIN_USER` + `DEFAULT_ADMIN_PASSWORD` das Konto an. Die
  Vorgaben (`Admin` / `admin`) stehen in `src/lib/admin-defaults.ts` — in
  `src/lib/`, weil Server und Anmeldeseite beide darauf zugreifen und
  `src/server/` nicht aus `'use client'` importiert werden darf. Es gibt kein
  `ADMIN_PASSWORD`-Secret mehr.
- **Benutzername case-insensitive**: Die Anmeldung sucht mit `COLLATE NOCASE`,
  angelegt wird aber unter der Schreibweise aus `ADMIN_USER`. Sonst hinge die
  Schreibweise des Kontos davon ab, wie sich jemand zufällig zuerst angemeldet
  hat.
- **Kein eigenes Passwort gesetzt** heißt: `users.password_hash` ist der leere
  String. Bis zur ersten Vergabe gilt dann weiter das Standardpasswort.
  Bewusst dieselbe Spalte statt eines zweiten Kennzeichens, das auseinanderlaufen
  könnte. Der leere Hash ist unbestätigbar — `verifyPassword` bricht ohne den
  Trenner `:` ab.
- **Passwortzwang**: `withAdmin()` gibt 403 zurück, solange
  `auth.mustSetPassword` gilt. Einzige Ausnahme ist `POST /api/admin/password`
  mit `{ allowWithoutPassword: true }` — sonst käme man aus dem Zustand nicht
  heraus. Der Zwang steckt im Server, nicht nur im Dialog: Ein Dialog im Browser
  ließe sich durch direkte API-Aufrufe umgehen.
- **Passwort setzen/wechseln** über `POST /api/admin/password`. Das bisherige
  Passwort wird nur verlangt, wenn eines gesetzt ist. Beendet alle Sitzungen des
  Benutzers außer der aufrufenden. **Keine Mindestlänge**, aber nicht leer.
- `GET /api/admin/setup-status` sagt ohne Anmeldung (nur Ja/Nein), warum eine
  Anmeldung gerade nicht klappt — inklusive `needsPassword`.
- Jeder Admin-Handler ist in `withAdmin()` aus `src/server/guard.ts` gekapselt — Bindings, Auth und Fehlerbehandlung an einer Stelle.
- Alle Änderungen landen im `audit_logs`.
- Tabs: Stundenplan · Ankündigungen · Termine · Bilder · Einstellungen.

### Pages / Routes

| Route | Beschreibung |
|---|---|
| `/` | Startseite — heutiger Plan, Countdown, Tagesmeldung, Ankündigungen |
| `/stundenplan` | Tagesweise Ansicht |
| `/woche` | Ganze Woche |
| `/pinnwand` | Alle aktiven Ankündigungen |
| `/weiteres` | Zusatzinfos, Links |
| `/tv` | Wandbildschirm — Uhr, Pinnwand, Bilder-Slideshow, Stundenplan-Raster |
| `/admin` | Adminbereich |

### API Routes

| Endpoint | Methoden | Beschreibung |
|---|---|---|
| `/api/bootstrap` | GET | Versions-Hash mit ETag/304 — von `TimetableAutoRefresh` gepollt |
| `/api/timetable` | GET | Aktiver Stundenplan, optional `?klasse=` |
| `/api/timetable/classes` | GET | Klassen im aktiven Plan |
| `/api/announcements` | GET | Aktive Ankündigungen, optional `?klasse=` |
| `/api/events` | GET | Anstehende Termine, optional `?klasse=` |
| `/api/settings` | GET | Öffentliche Einstellungen |
| `/api/media/:id` | GET | Bild aus R2 (dauerhaft cachebar) |
| `/api/admin/login` · `logout` · `session` · `setup-status` | POST/GET | Anmeldung |
| `/api/admin/announcements[/:id]` | GET/POST/PUT/DELETE | Ankündigungen |
| `/api/admin/events[/:id]` | GET/POST/PUT/DELETE | Termine |
| `/api/admin/uploads[/:id]` | GET/POST/DELETE | Stundenplan-Uploads |
| `/api/admin/uploads/:id/activate` | POST | Plan aktivieren |
| `/api/admin/media[/:id]` | GET/POST/DELETE | Bilder |
| `/api/admin/settings` | GET/PUT | Einstellungen |
| `/api/admin/password` | POST | Eigenes Passwort ändern |
| `/api/admin/audit` | GET | Audit-Log |

## Coding Conventions

### TypeScript

- **Strict mode**. `any` nur, wenn wirklich unvermeidbar.
- Pfad-Alias `@/*` → `./src/*`. Keine tiefen relativen Importe (`../../..`).
- Nur `.ts`/`.tsx` in `src/`.
- Code unter `src/server/` läuft ausschließlich serverseitig und darf niemals aus einer `'use client'`-Datei importiert werden.

### Styling

- **Tailwind** für Layout und Abstände.
- **CSS Modules** für komponenteneigene Styles.
- **CSS-Custom-Properties** aus `tokens.css` für Farben (`var(--surface)`, `var(--accent)`).
- Gemeinsame Klassen (`.card`, `.btn`, `.surface`) in `components.css`.
- Der Adminbereich nutzt überwiegend rohes Tailwind — das ist gewachsen und weicht vom Rest ab.

### Components

- Seiten sind async **React Server Components** mit `export const dynamic = 'force-dynamic'`.
- `searchParams` und `params` sind in Next 16 **Promises** und müssen `await`et werden.
- Client-Komponenten brauchen `'use client'`.

### German Language

- Alle sichtbaren Texte und alle Fehlermeldungen der API sind auf Deutsch.
- Kommentare überwiegend deutsch, Bezeichner englisch.

## Environment Variables

| Name | Wo | Zweck |
|---|---|---|
| `ADMIN_USER` | `wrangler.toml` unter `[vars]` | Benutzername für `/admin` (Standard `Admin`). Beim Anmelden groß-/kleinschreibungs-unempfindlich. |

Das ist die **einzige** Variable. Es gibt kein Secret und keine `.env` — `next dev`
bekommt die Bindings über `initOpenNextCloudflareForDev()` aus `wrangler.toml`.

Der Preis dafür: Bis zur ersten Anmeldung gilt `Admin` / `admin`, und `/admin`
ist öffentlich. Das Konto kann sich in diesem Fenster jede und jeder nehmen, der
die Adresse kennt — das Passwort steht in der Anleitung, es ist nicht zu raten.
Das Fenster schließt die erste Passwortvergabe; deshalb weisen README,
`docs/ADMIN.md` und die Ausgabe von `npm run setup` darauf hin, sich direkt nach
dem Deploy anzumelden.

## Testing

- **Vitest** (`npm run test:unit`), Testdateien als `*.test.ts` neben dem Quellcode.
- Passwortregeln und Hashing sind in `src/server/auth.test.ts` abgedeckt.
- Abgedeckt sind vor allem die Teile ohne Netz- und DB-Abhängigkeit: PDF-Parser (mit nachgebautem pdfjs-Dokument), Schema-Validierung der Upload-Daten, Gruppierung der Stundenplan-Zeilen, Klassenauswahl, Klassenfilter.
- `announcements.test.ts` prüft Ablauf und Reihenfolge gegen eine nachgebaute D1 (`fakeDb`) mit fester Systemzeit — das deutsche Datumsformat lässt sich sonst nicht sinnvoll testen.

## Important Notes

- Zeitzone ist durchgängig **Europe/Berlin**. Alle Zeit- und Datumslogik steht in
  `src/lib/berlin-time.ts` — **eine** Quelle für Server und Browser. Die Datei hat
  bewusst kein `'use client'`, damit beide Seiten sie importieren können. Es gab
  hier einmal drei Kopien, die still auseinanderliefen.
- Klassencodes folgen `[A-ZÄÖÜ]{1,5}\d{1,2}[A-Z]?` (z. B. `HT11`, `G21`).
- Das **Stundenplan-Modell** (`Weekday`, `LessonEntry`, `WeekPlan`, `ParsedSchedule`)
  wird nur in `src/lib/timetable/types.ts` deklariert; `src/server/types.ts`
  re-exportiert es. Der geparste Plan wandert als JSON vom Browser zum Server —
  zwei getrennte Deklarationen könnten unbemerkt auseinanderlaufen.
- **Ankündigungen speichern ihr Datum als `TT.MM.JJJJ HH:mm`** — ein Erbe aus der
  Zeit der TXT-Dateien. In diesem Format ist die Zeichenkette nicht sortierbar
  (sie beginnt mit dem Tag im Monat). Ablauf und Reihenfolge werden deshalb in
  `services/announcements.ts` in TypeScript ausgewertet, **nicht im SQL**. Termine
  benutzen dagegen ISO und dürfen im SQL verglichen werden.
- **Dunkelmodus ist die Voreinstellung**: `tokens.css` setzt die dunklen Werte auf
  `:root` und schaltet über die Klasse `light` auf hell um. Eine Klasse `dark`
  gibt es nicht — deshalb steht in `tailwind.config.ts`
  `darkMode: ['selector', ':root:not(.light)']`. Mit Tailwinds Standard griffe
  keine einzige `dark:`-Utility.
- D1 erlaubt **maximal 100 Statements pro `batch()`** — `storeSchedule()` teilt entsprechend auf.
- **Tote Teile im Schema** (bewusst nicht migriert, weil ein Eingriff in die
  Live-Datenbank mehr Risiko wäre als Nutzen): die Tabelle `classes` wird nicht
  mehr beschrieben und nie gelesen — die Klassenliste kommt aus
  `timetable_entries`. Ebenso ungenutzt: `users.role`,
  `timetable_uploads.parse_started_at` und die Status-Werte `'uploaded'` und
  `'parsing'`, die seit dem Parsen im Browser nicht mehr entstehen.
- `public/sw.js` und `public/pdfjs/` werden von `scripts/prebuild.mjs` erzeugt und sind **nicht eingecheckt**. Änderungen am Service Worker gehören in `scripts/sw.template.js`.
- Der Deploy-Workflow migriert die Datenbank **nach** dem Deploy. Ohne diesen Schritt bleibt D1 leer und die App zeigt nichts an.
