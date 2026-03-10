# HGH-App — Stundenplan & Infos für die HGH Holztechnik und Gestaltung Hildesheim

Eine Web-App (PWA), die den Schülern Stundenpläne, Ankündigungen, Termine und mehr anzeigt.

## Schnellstart — Einrichtung in 3 Schritten

### Was du brauchst

- **Node.js** (**Version 20 oder neuer**) → [nodejs.org](https://nodejs.org)
- Ein **Cloudflare-Konto** (kostenlos) → [dash.cloudflare.com](https://dash.cloudflare.com)

### Los geht's

```bash
# 1. Projekt herunterladen und in den Ordner wechseln
git clone <repository-url>
cd HGH-App

# 2. Setup-Skript starten — macht alles automatisch:
#    ✓ Abhängigkeiten installieren
#    ✓ Bei Cloudflare anmelden (Browser öffnet sich)
#    ✓ Datenbank + Dateispeicher erstellen
#    ✓ Tabellen anlegen
#    ✓ Admin-Passwort abfragen
#    ✓ Lokale Entwicklung vorbereiten
npm run setup

# 3. App veröffentlichen
npm run deploy
```

Das war's! Danach öffne `/admin` im Browser und melde dich an:
- **Benutzername:** `redaktion`
- **Passwort:** das eben eingegebene Passwort


## Cloudflare-Projekt richtig konfigurieren

Diese App läuft als **Next.js auf Cloudflare Workers** mit **OpenNext für Cloudflare**.

- Nutze im Dashboard ein **Workers-Projekt** (kein Pages-Static-Export).
- Build-Command für CI/Cloudflare (Web): `npm clean-install && npm run build:web`
- Deploy-Command: `npm run deploy`
- Falls ein altes Pages-Projekt existiert, nicht mehr für dieses Repo verwenden.

## Lokal entwickeln

Du brauchst zwei Terminals:

```bash
# Terminal 1 — API-Worker
npm run dev:api

# Terminal 2 — Frontend
npm run dev
```

Dann öffne [http://localhost:3000](http://localhost:3000). Admin-Login lokal: `redaktion` / `admin123`.

## GitHub Codespaces (Firefox/Edge)

Wenn du die App in einem Codespace testest, starte sie **lokal im Codespace** (ohne Deploy):

```bash
# Terminal 1
npm run dev:api

# Terminal 2
npm run dev
```

Danach in der Ports-Ansicht den Port **3000** auf „Öffentlich“ stellen und im Browser öffnen.

- Frontend-URL öffnen: `https://<dein-codespace>-3000.app.github.dev`
- Login lokal: `redaktion` / `admin123`
- Wichtig: In Firefox/Edge Pop-up-/Cookie-Blocker für die Codespace-Domain deaktivieren, sonst kann der Admin-Login fehlschlagen.

## Wichtige Befehle

| Befehl | Was passiert |
|--------|-------------|
| `npm run setup` | Ersteinrichtung (einmalig) |
| `npm run dev` | Frontend starten |
| `npm run dev:api` | API-Worker lokal starten |
| `npm run dev:worker` | OpenNext-Worker lokal testen |
| `npm run deploy:web` | Web-Worker (OpenNext) deployen |
| `npm run deploy:api` | API-Worker deployen |
| `npm run deploy` | Web + API gemeinsam deployen |
| `npm run build` | Produktions-Build (Web/OpenNext) |
| `npm run lint` | Code auf Fehler prüfen |
| `npm run test:unit` | Tests ausführen |

## Weiterführend

- **[Admin-Handbuch](docs/ADMIN.md)** — Stundenpläne hochladen, Ankündigungen und Termine verwalten, Probleme lösen
- **[Inhaltsformate](docs/CONTENT_FORMATS.md)** — Technische Details zu Datenformaten


## Deployment-Architektur

Die App nutzt **zwei Worker** mit klarer Trennung:

1. **Web-Worker (OpenNext)** aus `wrangler.toml` im Repo-Root (`npm run deploy:web`)
2. **API-Worker** aus `worker/wrangler.toml` (`npm run deploy:api`)

Damit die Web-App API-Aufrufe unter `/api/*` korrekt an den API-Worker weiterleitet, setze im Web-Worker die Variable:

```bash
API_ORIGIN=https://<dein-api-worker>.workers.dev
```

Lokal ist `API_ORIGIN` nicht nötig, da automatisch auf `http://localhost:8787` weitergeleitet wird.
