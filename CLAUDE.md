# CLAUDE.md — HGH-App

## Überblick

PWA der Berufsbildenden Schule **Holztechnik und Gestaltung Hildesheim**:
Wochenstundenplan aus PDF-Dateien, Ankündigungen, Kalender, Tagesmeldungen,
Countdown und ein Wandbildschirm. Die Oberfläche ist durchgehend **deutsch**.

| | |
|---|---|
| Laufzeit | **ein** Cloudflare Worker für Oberfläche und API (über OpenNext) |
| Framework | Next.js 16 (App Router), React 18 |
| Datenbank | Cloudflare D1 (SQLite) |
| Dateien | Cloudflare R2 |
| Sprache | TypeScript (strict) |
| Styling | Tailwind + CSS Modules + Tokens aus `tokens.css`; Dunkelmodus ist die Voreinstellung (siehe *Fallstricke*) |
| Tests / Lint | Vitest · ESLint (`next/core-web-vitals`, `next/typescript`) |

## Befehle

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

## Verzeichnisse

```
├── wrangler.toml              # Worker: Assets, D1, R2, ADMIN_USER
├── next.config.mjs            # Favicon-Rewrites, Caching-Header, Dev-Bindings
├── open-next.config.ts        # baut über `npm run build:next`
├── migrations/                # 0001_initial_schema, 0002_feedback
│
├── scripts/
│   ├── setup.mjs              # Ersteinrichtung lokal / auf Cloudflare
│   ├── prebuild.mjs           # erzeugt public/sw.js + public/pdfjs/
│   └── sw.template.js         # Service-Worker-Vorlage (__BUILD_VERSION__)
│
├── public/                    # Branding, manifest.webmanifest;
│                              #   sw.js und pdfjs/ generiert, nicht eingecheckt
├── docs/                      # ADMIN.md, CONTENT_FORMATS.md (für die Schule)
│
└── src/
    ├── app/
    │   ├── page.tsx layout.tsx error.tsx loading.tsx not-found.tsx
    │   ├── stundenplan/ woche/ pinnwand/ weiteres/ galerie/ tv/
    │   ├── admin/ui/          # AdminWorkspace + fünf Tabs, parts.tsx,
    │   │                      #   admin.module.css
    │   └── api/               # ── die komplette API ──
    │       ├── bootstrap/ timetable/ announcements/ settings/ media/ feedback/
    │       └── admin/         # login, logout, session, setup-status,
    │                          #   announcements, uploads, media, feedback,
    │                          #   settings, password, audit
    │
    ├── server/                # nur im Worker
    │   ├── env.ts             # Bindings über getCloudflareContext()
    │   ├── types.ts           # CloudflareEnv, DB-Zeilen; Stundenplan-Typen
    │   │                      #   re-exportiert aus lib/timetable/types
    │   ├── auth.ts            # Session-Cookie, requireAuth, Ersteinrichtung
    │   ├── guard.ts           # withAdmin() — Bindings + Auth + Fehler
    │   ├── responses.ts       # jsonResponse, errorResponse, withErrorHandling
    │   ├── page-data.ts       # Datenbeschaffung der Server Components
    │   └── services/          # timetable, schedule, activation, announcements,
    │                          #   settings, media, feedback, password,
    │                          #   upload-naming, base64, audit
    │
    ├── components/            # announcements/ schedule/ tv/ feedback/ ui/
    │
    ├── lib/                   # von beiden Seiten nutzbar
    │   ├── api/client.ts      # API-Client — nur Adminbereich (Browser)
    │   ├── admin-defaults.ts  # Standardzugang für die Ersteinrichtung
    │   ├── berlin-time.ts     # einzige Quelle für Zeit-/Datumslogik
    │   ├── base64.ts          # Kodierung für Uploads (Browser-Hälfte)
    │   ├── feedback.ts        # Kategorien der Rückmeldungen
    │   ├── timetable/         # Parser, Typen, Stundenzeiten, Klassenauswahl
    │   ├── calendar/          # Feiertage/Ferien, Google-Kalender-URLs
    │   └── storage/           # preferences, admin-session (localStorage)
    │
    └── styles/                # globals, tokens, base, components, layout,
                               #   features-timetable
```

## Architektur

### Ein Worker, eine Origin

Oberfläche und API laufen im **selben** Worker. Die API besteht aus Next.js
Route Handlers unter `src/app/api/`; D1 und R2 kommen über
`getCloudflareContext()` aus `@opennextjs/cloudflare` (gekapselt in
`src/server/env.ts`). Also: kein CORS, keine `Access-Control-*`-Header, keine
Cookie-Sonderfälle, keine API-URL zu konfigurieren, ein Deploy, eine
`wrangler.toml`.

### Server Components lesen direkt aus D1

Die öffentlichen Seiten rufen **nicht** die eigene HTTP-API auf, sondern die
Service-Funktionen aus `src/server/services/`, gebündelt in
`src/server/page-data.ts`. Das ist keine Stilfrage: Ein `fetch('/api/…')` mit
relativer URL lässt sich serverseitig nicht auflösen und wirft — die Seiten
zeigten dadurch dauerhaft „Kein Stundenplan verfügbar“.

`src/lib/api/client.ts` ist deshalb ausschließlich für den Adminbereich da, der
im Browser läuft.

### Datenfluss

- **Stundenplan**: Admin wählt PDF → **Auswertung im Browser**
  (`parse-pdf-browser.ts`) → Vorschau → PDF + JSON an `POST /api/admin/uploads`
  → Server validiert (`services/schedule.ts`) → `timetable_entries` in D1, PDF
  in R2 → aktivieren (automatisch oder von Hand, siehe *Adminbereich*).
- **Anzeige**: Server Components lesen den aktiven Upload aus D1; ohne aktiven
  Plan den zuletzt archivierten.
- **Ankündigungen/Einstellungen**: D1, gepflegt über den Adminbereich.
  Hervorgehobene Ankündigungen erscheinen zusätzlich als Sondertermin über dem
  Stundenplan (`announcementsToEvents` in `page-data.ts`).
- **Bilder**: R2 + `media_files`, ausgeliefert über `GET /api/media/:id`; der
  Bucket bleibt privat.
- **Rückmeldungen**: Formular unter `/weiteres` → `POST /api/feedback` (ohne
  Anmeldung) → `feedback` in D1 → Tab „Rückmeldungen“ im Adminbereich.
- **Klassenauswahl**: `localStorage` im Browser, in der URL als `?klasse=`
  gespiegelt.

### PDF-Parsing läuft im Browser

Der Workers-Free-Plan erlaubt **10 ms CPU-Zeit pro Request**; ein Stundenplan-PDF
auszuwerten liegt weit darüber. Deshalb:

- `parse-pdf.ts` ist der Einstieg; `getDocument` wird injiziert und ist damit
  ohne echtes PDF testbar. Zurück kommt neben dem Plan eine Liste
  **Warnungen** — unsichere Stellen werden gemeldet, nicht geraten, und stehen
  in der Upload-Vorschau.
- `parse-pdf-browser.ts` lädt pdfjs **zur Laufzeit** aus `public/pdfjs/` (Import
  über eine Variable, damit kein Bundler die 1,5 MB einbaut).
- Der Server parst nichts, **validiert aber vollständig** (`validateSchedule`):
  Klassencode-Muster, Wochentage, Stundennummern, Textlängen, Mengen.

Dateinamen-Konvention: `Stundenplan_kw_XX_HjY_YYYY_YY.pdf` (KW, Halbjahr,
Schuljahr), ausgewertet in `services/upload-naming.ts`.

#### Wie der Parser die Tabelle liest

Der Plan ist ein Excel-Export, und Excel **zeichnet die Zellrahmen** ins PDF.
Über `getOperatorList()` sind diese Striche auslesbar — damit muss nichts
geraten werden:

| Frage | Antwort aus dem Raster |
|---|---|
| Was ist ein Raum? | Was in der Spalte unter „R“ steht |
| Welche Stunden gehören zusammen? | So weit, wie die Zelle reicht |
| Wo endet ein Tag? | Die Tagesspalte ist je Tag **eine** verbundene Zelle |
| Für wen gilt ein Sondertermin? | Für die Klassen, über deren Spalten seine Zelle reicht |

Ohne das Raster lässt sich nichts davon sicher sagen: Die Raumnummer sitzt
mittig in der verbundenen Zelle und landet je nach Zeilenhöhe mal auf der Fach-,
mal auf der Lehrerzeile; ein Sondertermin steht zentriert über mehreren Klassen.

- `pdf-grid.ts` — Zeichenbefehle → Linien → Zellen (reine Geometrie).
- `parse-grid.ts` — Zellen → Stundenplan.
- `cell-values.ts` — was ein Raum-, was ein Lehrerkürzel ist (nur die Form;
  **wo** es steht, entscheidet `parse-grid.ts`).

**Rückfall ohne Tabelle**: Bringt ein PDF keine Zellrahmen mit (oder ändert
pdfjs das Format seiner Zeichenbefehle), leitet `parse-pdf.ts` das Raster aus
den senkrechten Lücken im Textbild ab und trennt die Tage am Neustart der
Stundenzählung. Das ist ungenauer, wird in der Vorschau als Warnung gemeldet —
aber der Upload bricht nicht ab. `result.source` sagt, welcher Weg gegriffen
hat. Alle Seiten werden ausgewertet und zusammengeführt.

### Adminbereich

Tabs: Stundenplan · Ankündigungen · Bilder · Rückmeldungen · Einstellungen.

**Anmeldung und Passwort**

- Passwort-Anmeldung (PBKDF2-SHA256), Session-Token in D1, 12 Stunden gültig.
- **Ersteinrichtung ohne Secret**: Solange die `users`-Tabelle leer ist, legt der
  erste Login mit `ADMIN_USER` + `DEFAULT_ADMIN_PASSWORD` das Konto an. Die
  Vorgaben (`Admin` / `admin`) stehen in `src/lib/admin-defaults.ts` — in
  `src/lib/`, weil Server und Anmeldeseite beide darauf zugreifen und
  `src/server/` nicht aus `'use client'` importiert werden darf.
- **Benutzername case-insensitive**: Gesucht wird mit `COLLATE NOCASE`, angelegt
  unter der Schreibweise aus `ADMIN_USER` — sonst hinge die Schreibweise des
  Kontos davon ab, wie sich jemand zufällig zuerst angemeldet hat.
- **Kein eigenes Passwort gesetzt** heißt: `users.password_hash` ist der leere
  String; bis zur ersten Vergabe gilt weiter das Standardpasswort. Bewusst
  dieselbe Spalte statt eines zweiten Kennzeichens, das auseinanderlaufen
  könnte. Der leere Hash ist unbestätigbar — `verifyPassword` bricht ohne den
  Trenner `:` ab.
- **Passwortzwang**: `withAdmin()` gibt 403 zurück, solange
  `auth.mustSetPassword` gilt; einzige Ausnahme ist `POST /api/admin/password`
  mit `{ allowWithoutPassword: true }`. Der Zwang steckt im Server, nicht nur im
  Dialog — ein Dialog ließe sich per direktem API-Aufruf umgehen.
- **Passwort setzen/wechseln** über `POST /api/admin/password`: Das bisherige
  wird nur verlangt, wenn eines gesetzt ist; beendet alle Sitzungen des Benutzers
  außer der aufrufenden; **keine Mindestlänge**, aber nicht leer.
- `GET /api/admin/setup-status` sagt ohne Anmeldung (nur Ja/Nein), warum eine
  Anmeldung gerade nicht klappt — inklusive `needsPassword`.
- **Abmelden sitzt in der Kopfzeile** neben hell/dunkel. Der Anmeldezustand
  dafür steht in `src/lib/storage/admin-session.ts` — nur im Speicher, die
  Wahrheit bleibt das Session-Cookie.

**Aufbau**

- Jeder Admin-Handler ist in `withAdmin()` (`src/server/guard.ts`) gekapselt:
  Bindings, Auth und Fehlerbehandlung an einer Stelle. Alle Änderungen landen im
  `audit_logs`.
- `src/app/admin/ui/parts.tsx` und `admin.module.css` liefern Karten, Felder,
  Schalter, Listen, Hinweise und die Klassenauswahl — damit benutzt der
  Adminbereich dieselben Tokens wie der Rest der App statt eigener Grautöne.
- **Klassen wählt man aus**, statt sie zu tippen: `ClassPicker` liest die Klassen
  des aktiven Plans aus `GET /api/timetable/classes`. Gespeichert wird weiterhin
  die Liste `HT11, G21`, weil die Filter der öffentlichen Seiten darauf aufbauen;
  ein freies Feld bleibt für Klassen ohne Unterricht im Plan.
- **Automatik für den aktiven Plan**: `timetable_auto_activate` ('1'/'0', ohne
  Eintrag an). Ist sie an, aktiviert `POST /api/admin/uploads` den frischen
  Upload sofort, sonst wird von Hand ausgewählt. Das Aktivieren selbst steht in
  `services/activation.ts`, damit beide Wege denselben `batch()` benutzen und nie
  zwei Pläne aktiv sind.

## Seiten

| Route | Beschreibung |
|---|---|
| `/` | Startseite — heutiger Plan, Countdown, Tagesmeldung, Ankündigungen |
| `/stundenplan` | Tagesweise Ansicht |
| `/woche` | Ganze Woche |
| `/pinnwand` | Alle aktiven Ankündigungen |
| `/weiteres` | Zusatzinfos, Links, Rückmeldeformular |
| `/galerie` | Bildergalerie (dieselben Bilder wie die TV-Slideshow), verlinkt aus `/weiteres` |
| `/tv` | Wandbildschirm — Uhr, Pinnwand, Slideshow, Stundenplan. Während des Schultags je Klasse nur die laufende und die nächste Stunde (`TvNextLessons`), danach das ganze Tagesraster (`TvTimetableGrid`); `TvSchedulePanel` schaltet um. Das Schullogo führt zurück auf `/`. |
| `/admin` | Adminbereich |

## API

| Endpoint | Methoden | Beschreibung |
|---|---|---|
| `/api/bootstrap` | GET | Versions-Hash mit ETag/304 — von `TimetableAutoRefresh` gepollt; `timetable` ist ein zweiter Stempel nur für den aktiven Plan |
| `/api/timetable` | GET | Aktiver Stundenplan, optional `?klasse=` |
| `/api/timetable/classes` | GET | Klassen im aktiven Plan |
| `/api/announcements` | GET | Aktive Ankündigungen, optional `?klasse=` |
| `/api/settings` | GET | Öffentliche Einstellungen |
| `/api/media/:id` | GET | Bild aus R2 (dauerhaft cachebar) |
| `/api/feedback` | POST | Rückmeldung abgeben — ohne Anmeldung |
| `/api/admin/login` · `logout` · `session` · `setup-status` | POST/GET | Anmeldung |
| `/api/admin/announcements[/:id]` | GET/POST/PUT/DELETE | Ankündigungen |
| `/api/admin/uploads[/:id]` | GET/POST/DELETE | Stundenplan-Uploads |
| `/api/admin/uploads/:id/activate` | POST | Plan aktivieren |
| `/api/admin/media[/:id]` | GET/POST/DELETE | Bilder |
| `/api/admin/feedback[/:id]` | GET/PUT/DELETE | Rückmeldungen (PUT setzt nur den Status) |
| `/api/admin/settings` | GET/PUT | Einstellungen |
| `/api/admin/password` | POST | Eigenes Passwort ändern |
| `/api/admin/audit` | GET | Audit-Log |

## Konventionen

**TypeScript**

- Strict mode; `any` nur, wenn wirklich unvermeidbar.
- Pfad-Alias `@/*` → `./src/*`, keine tiefen relativen Importe (`../../..`).
- Nur `.ts`/`.tsx` in `src/`.
- `src/server/` läuft ausschließlich serverseitig und darf **niemals** aus einer
  `'use client'`-Datei importiert werden. Was beide Seiten brauchen, liegt in
  `src/lib/`.

**Styling**

- Tailwind für Layout und Abstände, CSS Modules für komponenteneigene Styles.
- Farben immer über die Custom Properties aus `tokens.css` (`var(--surface)`,
  `var(--accent)`), nie als feste Werte.
- Gemeinsame Klassen (`.card`, `.btn`, `.surface`, `.select`) in
  `components.css`.

**Komponenten**

- Seiten sind async **React Server Components** mit
  `export const dynamic = 'force-dynamic'`.
- `searchParams` und `params` sind in Next 16 **Promises** und müssen `await`et
  werden.
- Client-Komponenten brauchen `'use client'`.

**Sprache**

- Alle sichtbaren Texte und alle Fehlermeldungen der API sind deutsch.
- Kommentare überwiegend deutsch, Bezeichner englisch.

## Umgebung

`ADMIN_USER` in `wrangler.toml` unter `[vars]` (Benutzername für `/admin`,
Standard `Admin`) ist die **einzige** Variable. Es gibt kein Secret und keine
`.env` — `next dev` bekommt die Bindings über `initOpenNextCloudflareForDev()`
aus `wrangler.toml`.

Der Preis dafür: Bis zur ersten Anmeldung gilt `Admin` / `admin`, und `/admin`
ist öffentlich. In diesem Fenster kann sich jede und jeder das Konto nehmen, der
die Adresse kennt — das Passwort steht in der Anleitung, es ist nicht zu raten.
Das Fenster schließt die erste Passwortvergabe; deshalb weisen README,
`docs/ADMIN.md` und die Ausgabe von `npm run setup` darauf hin, sich direkt nach
dem Deploy anzumelden.

## Tests

Vitest (`npm run test:unit`), Testdateien als `*.test.ts` neben dem Quellcode.
Abgedeckt ist vor allem, was ohne Netz und DB läuft: PDF-Parser, Validierung der
Upload-Daten, Gruppierung der Stundenplan-Zeilen, Klassenauswahl und -filter,
Stundenzeiten, Dateinamen, Passwortregeln und Hashing (`src/server/auth.test.ts`).

- `parse-grid.test.ts` baut eine **gezeichnete Tabelle** nach (Linien und Text)
  und prüft damit den Regelweg — inklusive verbundener Zellen für Sondertermine
  und Blöcke.
- `parse-pdf.test.ts` und `real-week.test.ts` zeichnen bewusst **nur Text** und
  prüfen damit den Rückfallweg. `real-week.test.ts` nimmt dafür eine ganze echte
  Planwoche (sieben Klassen, `real-week.fixture.ts`): Der Parser scheitert nicht
  an einzelnen Regeln, sondern an der Größe — viele Spalten nebeneinander, eine
  Klasse ohne Unterricht, Blöcke über den ganzen Tag.
- `announcements.test.ts` prüft Ablauf und Reihenfolge gegen eine nachgebaute D1
  (`fakeDb`) mit fester Systemzeit — das deutsche Datumsformat lässt sich sonst
  nicht sinnvoll testen.

## Fallstricke

- **Zeit ist immer Europe/Berlin**, und alle Zeit- und Datumslogik steht in
  `src/lib/berlin-time.ts` — **eine** Quelle für Server und Browser. Die Datei
  hat bewusst kein `'use client'`, damit beide Seiten sie importieren können; es
  gab hier einmal drei Kopien, die still auseinanderliefen.
- **Dunkelmodus ist die Voreinstellung**: `tokens.css` setzt die dunklen Werte
  auf `:root` und schaltet über die Klasse `light` auf hell um. Eine Klasse
  `dark` gibt es nicht — deshalb steht in `tailwind.config.ts`
  `darkMode: ['selector', ':root:not(.light)']`. Mit Tailwinds Standard griffe
  keine einzige `dark:`-Utility.
- **Ankündigungen speichern ihr Datum als `TT.MM.JJJJ HH:mm`** — ein Erbe aus der
  Zeit der TXT-Dateien. So ist die Zeichenkette nicht sortierbar (sie beginnt mit
  dem Tag im Monat); Ablauf und Reihenfolge wertet deshalb
  `services/announcements.ts` in TypeScript aus, **nicht im SQL**.
- **Hinweise an den Nutzer nur beim Stundenplan**: `ServiceWorkerRegister`
  aktualisiert die App still (neu geladen wird erst, wenn sie im Hintergrund
  liegt) — über ein App-Update muss niemand entscheiden. Gemeldet wird
  ausschließlich ein neuer Plan: `/api/bootstrap` liefert dafür neben `version`
  den engeren Stempel `timetable` (nur der aktive Upload), den
  `TimetableAutoRefresh` gegen `hgh:timetable-version` aus dem `localStorage`
  hält. Auf `/tv` bleibt der Hinweis aus — dort steht niemand, der ihn wegklickt.
- Das **Stundenplan-Modell** (`Weekday`, `LessonEntry`, `WeekPlan`,
  `ParsedSchedule`) wird nur in `src/lib/timetable/types.ts` deklariert;
  `src/server/types.ts` re-exportiert es. Der geparste Plan wandert als JSON vom
  Browser zum Server — zwei Deklarationen könnten unbemerkt auseinanderlaufen.
- Klassencodes folgen `[A-ZÄÖÜ]{1,5}\d{1,2}[A-Z]?` (z. B. `HT11`, `G21`).
- D1 erlaubt **maximal 100 Statements pro `batch()`** — `storeSchedule()` teilt
  entsprechend auf.
- **Tote Teile im Schema**, bewusst nicht migriert (ein Eingriff in die
  Live-Datenbank wäre mehr Risiko als Nutzen): `classes` (die Klassenliste kommt
  aus `timetable_entries`), `events` und `announcements.audience` (seit Termine
  und Zielgruppe weggefallen sind), `users.role`,
  `timetable_uploads.parse_started_at` sowie die Status-Werte `'uploaded'` und
  `'parsing'`, die seit dem Parsen im Browser nicht mehr entstehen.
- `public/sw.js` und `public/pdfjs/` erzeugt `scripts/prebuild.mjs`; sie sind
  **nicht eingecheckt**. Änderungen am Service Worker gehören in
  `scripts/sw.template.js`.
- Der Deploy-Workflow migriert die Datenbank **nach** dem Deploy. Ohne diesen
  Schritt bleibt D1 leer und die App zeigt nichts an.
