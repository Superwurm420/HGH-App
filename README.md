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
#    ✓ Session-Geheimnis generieren
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

Diese App ist für **Cloudflare Workers** ausgelegt (Wrangler + `wrangler.toml`), **nicht** für Cloudflare Pages/OpenNext.

- Nutze im Dashboard ein **Workers-Projekt** mit `npm run deploy` (oder Git-Integration für Workers).
- Falls ein Pages-Projekt existiert, nicht für dieses Repo verwenden bzw. Build dort deaktivieren.
- Build-Command für CI/Cloudflare: `npm clean-install && npm run build` (lokale Prüfung) und Deployment über `npm run deploy`.

## Lokal entwickeln

Du brauchst zwei Terminals:

```bash
# Terminal 1 — Backend
npm run dev:worker

# Terminal 2 — Frontend
npm run dev
```

Dann öffne [http://localhost:3000](http://localhost:3000). Admin-Login lokal: `redaktion` / `admin123`.

## GitHub Codespaces (Firefox/Edge)

Wenn du die App in einem Codespace testest, starte sie **lokal im Codespace** (ohne Deploy):

```bash
# Terminal 1
npm run dev:worker

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
| `npm run dev:worker` | Backend starten |
| `npm run deploy` | App auf Cloudflare veröffentlichen |
| `npm run build` | Frontend bauen (ohne Veröffentlichung) |
| `npm run lint` | Code auf Fehler prüfen |
| `npm run test:unit` | Tests ausführen |

## Weiterführend

- **[Admin-Handbuch](docs/ADMIN.md)** — Stundenpläne hochladen, Ankündigungen und Termine verwalten, Probleme lösen
- **[Inhaltsformate](docs/CONTENT_FORMATS.md)** — Technische Details zu Datenformaten
