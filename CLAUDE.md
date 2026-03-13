# CLAUDE.md — HGH-App

## Project Overview

HGH-App is a **Progressive Web App (PWA)** for the **Holztechnik und Gestaltung Hildesheim** vocational school (BBS). It displays weekly timetables parsed from PDF files, school announcements, a calendar, daily messages, and a countdown timer. The entire UI is in **German**.

- **Frontend**: Next.js 16 (App Router) with React 18
- **Backend**: Cloudflare Worker (custom router, D1, R2)
- **Database**: Cloudflare D1 (SQLite)
- **File Storage**: Cloudflare R2
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS + CSS Modules (`.module.css`) + custom CSS tokens
- **Dark mode**: class-based (`darkMode: 'class'` in Tailwind config)
- **Testing**: Vitest
- **Linting**: ESLint with `next/core-web-vitals` and `next/typescript`

## Quick Reference — Commands

```bash
npm run dev              # Start Next.js dev server (Port 3000)
npm run dev:api          # Start Worker API dev server (wrangler, Port 8787)
npm run dev:worker       # Start OpenNext dev server (Port 8788)
npm run build            # Production build (OpenNext/Cloudflare)
npm run lint             # ESLint check
npm run typecheck        # TypeScript type check
npm run test:unit        # Run unit tests with Vitest
npm run db:migrate       # Apply D1 migrations (remote)
npm run db:migrate:local # Apply D1 migrations (local)
npm run deploy           # Deploy Web + API to Cloudflare
npm run deploy:web       # Deploy only frontend (OpenNext)
npm run deploy:api       # Deploy only Worker API
```

## Repository Structure

```
├── CLAUDE.md
├── wrangler.toml              # OpenNext/Frontend config (assets, Port 8788)
├── next.config.mjs            # Rewrites (favicons, dev API proxy), caching headers
├── tailwind.config.ts         # Custom colors, border-radius tokens
├── tsconfig.json              # Strict TS, path alias @/* → ./src/*
├── package.json
│
├── worker/                    # Cloudflare Worker Backend
│   ├── wrangler.toml          # Worker API config (D1, R2, Port 8787)
│   └── src/
│       ├── index.ts           # Worker entry: fetch handler, router setup, CORS
│       ├── router.ts          # URLPattern-based router
│       ├── types.ts           # Env bindings, DB types (Announcement, TimetableUpload, etc.)
│       ├── middleware/
│       │   └── auth.ts        # Session-Cookie-Prüfung (requireAuth, getOptionalAuth)
│       ├── routes/
│       │   ├── bootstrap.ts   # GET /api/bootstrap — Stundenplan + Ankündigungen + ETag
│       │   ├── timetable.ts   # GET /api/timetable, /api/timetable/classes
│       │   ├── announcements.ts # GET /api/announcements
│       │   ├── events.ts      # GET /api/events
│       │   ├── settings.ts    # GET /api/settings (public keys only)
│       │   └── admin/
│       │       ├── auth.ts    # POST login/logout, GET session, auto-setup
│       │       ├── announcements.ts # CRUD Ankündigungen
│       │       ├── events.ts  # CRUD Termine
│       │       ├── uploads.ts # PDF-Upload → R2 + Parsing → D1 timetable_entries
│       │       ├── settings.ts # GET/PUT app_settings
│       │       └── audit.ts   # GET audit_logs
│       ├── pdf-parser/
│       │   └── index.ts       # Stundenplan-PDF-Parser (pdfjs-dist), Dateiname-Parsing
│       └── services/
│           ├── audit.ts       # logAudit() — non-blocking D1 insert
│           ├── berlin-time.ts # Berlin-Zeitzone-Utilities
│           └── password.ts    # PBKDF2-SHA256 Hashing + Verifikation
│
├── migrations/
│   └── 0001_initial_schema.sql  # D1-Schema: users, sessions, classes, timetable_uploads,
│                                #   timetable_entries, announcements, events, media_files,
│                                #   app_settings, audit_logs
│
├── public/
│   ├── content/
│   │   └── branding/          # Logo, favicons, PWA icons
│   ├── manifest.webmanifest   # PWA manifest
│   └── sw.js                  # Service worker
│
├── src/
│   ├── app/                   # Next.js App Router pages
│   │   ├── page.tsx           # Home — today's schedule, countdown, announcements preview
│   │   ├── layout.tsx         # Root layout — Topbar, BottomNav, ThemeScript, SW registration
│   │   ├── stundenplan/       # Full timetable view (day-by-day)
│   │   ├── woche/             # Week view (all days at once)
│   │   ├── pinnwand/          # Bulletin board (all announcements)
│   │   ├── einstellungen/     # Settings page
│   │   ├── weiteres/          # "More" page
│   │   ├── tv/                # TV display mode (full-screen timetable grid)
│   │   ├── admin/             # Admin panel (Ankündigungen, Termine, Uploads)
│   │   │   ├── page.tsx
│   │   │   └── ui/            # AdminAnnouncementEditor, AdminEventEditor, AdminUploadManager, AdminWorkspace
│   │   ├── error.tsx
│   │   ├── loading.tsx
│   │   └── not-found.tsx
│   │
│   ├── components/
│   │   ├── announcements/     # AnnouncementItem, AnnouncementList, ExpiryCountdown
│   │   ├── schedule/          # ClassSelector, ClassFromStorage, DayTimetable, TodaySchedule, WeekSchedule, TvTimetableGrid
│   │   ├── tv/                # TvPageController
│   │   └── ui/                # BottomNav, Topbar, Clock, Countdown, DailyMessage, GoogleCalendar, MiniCalendar, NetworkDot, ThemeScript, ThemeToggle, ServiceWorkerRegister, TimetableAutoRefresh, UpdateNotice
│   │
│   ├── lib/
│   │   ├── api/client.ts      # API-Client für Worker-Backend (fetch-basiert)
│   │   ├── announcements/
│   │   │   └── parser.ts      # parseBerlinDate für Client-Seite
│   │   ├── timetable/
│   │   │   └── types.ts       # SchoolClass, Weekday, LessonEntry, WeekPlan, ParsedSchedule, SpecialEvent
│   │   ├── calendar/
│   │   │   └── lowerSaxonySchoolFreeDays.ts  # Feiertage + Schulferien Niedersachsen
│   │   ├── berlin-time.ts     # Berlin timezone utilities (Client-Seite)
│   │   ├── validation/content-schemas.ts  # Validierungsfunktionen
│   │   └── storage/preferences.ts  # Client-side localStorage preferences
│   │
│   └── styles/
│       ├── globals.css             # Tailwind directives + imports
│       ├── tokens.css              # CSS custom properties (colors, spacing)
│       ├── base.css                # Base element styles
│       ├── components.css          # Reusable component classes (.card, .btn, etc.)
│       ├── features-timetable.css  # Timetable-specific styles
│       ├── features-week.css       # Week view styles
│       └── layout.css              # Layout utilities
│
└── docs/
    ├── CONTENT_FORMATS.md     # Documentation for content file formats
    └── templates/             # Announcement templates
```

## Architecture & Key Patterns

### Dual-System Architecture

Das Projekt besteht aus zwei getrennten Systemen:

1. **Cloudflare Worker** (`worker/src/`) — API-Backend mit D1-Datenbank und R2-Storage
2. **Next.js Frontend** (`src/`) — UI, ruft Worker-API per `src/lib/api/client.ts` auf

In der Entwicklung: Next.js auf Port 3000 proxied `/api/*` an den Worker auf Port 8787 (konfiguriert in `next.config.mjs`). Es gibt zwei `wrangler.toml`-Dateien: die Root-Datei für OpenNext (Port 8788) und `worker/wrangler.toml` für die Worker-API (Port 8787, D1, R2).

### Data Flow

- **Storage**: D1 (SQLite) für strukturierte Daten, R2 für PDF-Dateien
- **PDF-Upload**: Admin lädt PDF hoch → R2 + D1 `timetable_uploads` → Parser extrahiert Stunden → D1 `timetable_entries`
- **Runtime (timetable)**: Worker liest aus D1 `timetable_entries` für den aktiven Upload
- **Runtime (announcements)**: Worker liest aus D1 `announcements`
- **Fallback**: Wenn kein aktiver Stundenplan existiert, wird automatisch der letzte geparste/archivierte verwendet
- **Client-side**: Class selection in `localStorage`, synced via `?klasse=` search param

### Admin System

- Password-based authentication (PBKDF2-SHA256)
- Session tokens in D1 `sessions` table (12-hour expiry)
- Auto-Setup: Erster Login mit `ADMIN_USER`/`ADMIN_PASSWORD` env vars erstellt automatisch den Admin-User
- Auth wird in jedem Admin-Handler via `requireAuth()` geprüft
- Admin panel at `/admin` provides CRUD for announcements, events, and timetable uploads
- Audit-Log: Alle Admin-Aktionen werden in `audit_logs` protokolliert

### PDF Parsing

Der Stundenplan-Parser (`worker/src/pdf-parser/index.ts`) verarbeitet PDF-Dateien:
- Erkennt Klassen-Header, Wochentag-Sektionen, Stunden/Zeiten
- Unterstützt Doppelstunden-Erkennung und Block-Sondereinträge
- Ergebnis wird in D1 `timetable_entries` gespeichert (Batch-Insert, max 100 Statements)

**PDF naming convention**: `Stundenplan_kw_XX_HjY_YYYY_YY.pdf` where XX = calendar week, Y = half-year (1 or 2), YYYY_YY = school year (e.g., 2025_26).

### Pages / Routes

| Route | Description |
|---|---|
| `/` | Home dashboard — today's schedule, countdown, daily message, announcements preview |
| `/stundenplan` | Day-by-day timetable with tab navigation |
| `/woche` | Full week schedule grid |
| `/pinnwand` | Bulletin board with all active announcements |
| `/einstellungen` | Settings (class selection, theme) |
| `/weiteres` | Additional info / links |
| `/tv` | TV display mode for wall-mounted screens |
| `/admin` | Admin panel for managing announcements, events, uploads |

### API Routes (Worker)

| Endpoint | Method | Description |
|---|---|---|
| `/api/bootstrap` | GET | Aktiver Stundenplan + Ankündigungen + Version (ETag/304) |
| `/api/timetable` | GET | Stundenplan, optional `?klasse=` Filter |
| `/api/timetable/classes` | GET | Alle Klassen im aktiven Stundenplan |
| `/api/announcements` | GET | Aktive Ankündigungen, optional `?klasse=` Filter |
| `/api/events` | GET | Aktive Termine |
| `/api/settings` | GET | Öffentliche App-Settings |
| `/api/admin/login` | POST | Login (Username + Passwort) |
| `/api/admin/logout` | POST | Logout |
| `/api/admin/session` | GET | Session-Validierung |
| `/api/admin/announcements` | GET/POST/PUT/DELETE | Ankündigungen CRUD |
| `/api/admin/events` | GET/POST/PUT/DELETE | Termine CRUD |
| `/api/admin/uploads` | GET/POST/DELETE | PDF-Upload + Parsing |
| `/api/admin/uploads/:id/activate` | POST | Stundenplan aktivieren |
| `/api/admin/settings` | GET/PUT | App-Settings |
| `/api/admin/audit` | GET | Audit-Logs |

## Coding Conventions

### TypeScript

- **Strict mode** enabled. Do not use `any` unless absolutely necessary.
- Path alias: `@/*` maps to `./src/*`. Always use `@/` imports, never relative `../` from deep paths.
- No JavaScript files in `src/` — only TypeScript (`.ts`, `.tsx`).
- Worker code lives in `worker/src/` with separate type system.

### Styling

- Use **Tailwind utility classes** for layout and spacing.
- Use **CSS Modules** (`.module.css`) for component-specific styles that need scoping.
- Use **CSS custom properties** from `tokens.css` for theme-aware colors (e.g., `var(--surface)`, `var(--accent)`).
- Common component classes (`.card`, `.btn`, `.surface`) are defined in `components.css`.

### Components

- Pages are **async React Server Components** (RSC). Use `export const dynamic = 'force-dynamic'` for pages that need fresh data.
- Client components must be explicitly marked with `'use client'`.
- Component files are organized by feature: `announcements/`, `schedule/`, `tv/`, `ui/`.

### German Language

- All user-facing text is in German.
- Code comments are a mix of German and English (German is preferred for domain-specific comments).
- Error messages returned by the API are in German.
- Variable names and function names are in English.

## Environment Variables

```bash
ADMIN_USER=redaktion              # Admin username (wrangler.toml [vars])
ADMIN_PASSWORD=...                # Admin password (wrangler secret)
```

Secrets werden via `wrangler secret put` gesetzt, nicht in `.env`.

## Testing

- **Test runner**: Vitest (`npm run test:unit`)
- Test files use the `.test.ts` / `.test.tsx` suffix and live next to their source files.

## Important Notes

- The app targets the **Europe/Berlin** timezone for all date logic.
- Class codes follow the pattern `[A-Z]{1,5}\d{1,2}[A-Z]?` (e.g., `HT11`, `G21`, `GT01`).
- D1 hat ein Batch-Limit von 100 Statements pro `batch()` Aufruf.
- PDF-Parsing läuft im selben Worker-Request wie der Upload — bei großen PDFs kann das CPU-Zeitlimit erreicht werden.
- Der Stundenplan hat einen Fallback: Wenn kein aktiver Plan gesetzt ist, wird der letzte geparste/archivierte verwendet.
