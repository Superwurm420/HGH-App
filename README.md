# HGH-App — Der digitale Stundenplan

Die HGH-App ist die Stundenplan-App der **BBS Holztechnik und Gestaltung Hildesheim**. Sie zeigt den aktuellen Stundenplan, Ankündigungen, Termine und einen Kalender an — direkt im Browser, auf jedem Gerät.

---

## Für Nutzer: So nutzt du die App

1. **Öffne die App** im Browser auf deinem Handy, Tablet oder Computer.
2. **Wähle deine Klasse** aus (z. B. HT11, G21) — das geht über die Einstellungen.
3. Auf der **Startseite** siehst du deinen heutigen Stundenplan, aktuelle Ankündigungen und einen Countdown.
4. Über die Navigation unten erreichst du weitere Bereiche:
   - **Stundenplan** — tageweise Ansicht
   - **Woche** — die ganze Woche auf einen Blick
   - **Pinnwand** — alle aktuellen Ankündigungen
   - **Einstellungen** — Klasse ändern, Design anpassen

### App auf dem Startbildschirm installieren

Die App lässt sich wie eine normale App auf dem Startbildschirm ablegen:

- **iPhone/iPad**: Tippe auf das Teilen-Symbol (Quadrat mit Pfeil nach oben) und dann auf „Zum Home-Bildschirm".
- **Android**: Tippe auf die drei Punkte im Browser-Menü und dann auf „Zum Startbildschirm hinzufügen" oder „App installieren".

---

## Für die Redaktion: Inhalte verwalten

Die Redaktion verwaltet Stundenpläne, Ankündigungen und Termine über den **Adminbereich**:

1. Öffne die App im Browser
2. Hänge `/admin` an die Adresse an (z. B. `https://deine-app.de/admin`)
3. Melde dich an

**Ausführliche Anleitung:** [Admin-Anleitung (docs/ADMIN.md)](docs/ADMIN.md)

Tagesmeldungen und Ferienzeiträume werden über Textdateien gepflegt:

**Anleitung dazu:** [Inhaltsdateien pflegen (docs/CONTENT_FORMATS.md)](docs/CONTENT_FORMATS.md)

---

## Für die IT-Betreuung

### Technik im Überblick

Die App besteht aus zwei Teilen:

- **Frontend**: Eine Website gebaut mit Next.js 16, gehostet auf Cloudflare
- **Backend (API)**: Ein Cloudflare Worker mit Datenbank (D1) und Dateispeicher (R2)

Beides wird auf Cloudflare betrieben. Deployment läuft automatisch über GitHub Actions.

---

### Ersteinrichtung (von Null auf Laufend)

#### Voraussetzungen

- [Node.js](https://nodejs.org/) Version 20 oder neuer
- npm (wird mit Node.js mitinstalliert)
- Ein [Cloudflare-Account](https://dash.cloudflare.com/sign-up) (kostenloser Plan reicht)
- Ein GitHub-Account (für den Code und automatisches Deployment)

#### Schritt 1: Code herunterladen

```bash
git clone https://github.com/DEIN-ACCOUNT/HGH-App.git
cd HGH-App
```

#### Schritt 2: Abhängigkeiten installieren

```bash
npm install
```

#### Schritt 3: Cloudflare-Ersteinrichtung in einem Command

```bash
npm run setup:init -- --cloudflare
```

Der zentrale Setup-Command übernimmt die Cloudflare-Anmeldung, D1/R2-Erstellung, das Setzen des Admin-Secrets und die Migration. Am Ende bekommst du eine kompakte Checkliste (`DB`, `Bucket`, `Secret`, `Migration`) mit `erledigt/offen`.

> Hinweis: Das Setzen von `ADMIN_PASSWORD` bleibt interaktiv. Wrangler fragt dich beim Lauf nach einem Passwort für den Adminzugang.

#### Schritt 4: GitHub Secrets einrichten

Damit das automatische Deployment funktioniert, müssen im GitHub-Repository zwei Secrets hinterlegt werden:

1. Gehe im Repository zu **Settings** → **Secrets and variables** → **Actions**
2. Erstelle folgende Secrets:
   - **`CLOUDFLARE_API_TOKEN`** — Ein Cloudflare API Token mit Rechten für Workers, D1 und R2. Erstelle diesen unter [Cloudflare Dashboard → API Tokens](https://dash.cloudflare.com/profile/api-tokens).
   - **`CLOUDFLARE_ACCOUNT_ID`** — Deine Cloudflare Account-ID. Findest du im Cloudflare Dashboard auf der Übersichtsseite rechts.

#### Schritt 5: Erster Deploy

Pushe den Code auf den `main`-Branch. GitHub Actions baut die App automatisch und deployed sie auf Cloudflare:

```bash
git push origin main
```

Der Workflow (`.github/workflows/deploy.yml`) führt automatisch aus:
1. Code herunterladen
2. Abhängigkeiten installieren
3. Code prüfen (Lint + Tests)
4. App bauen
5. Auf Cloudflare deployen

Danach ist die App unter der Cloudflare-URL erreichbar.

**Wichtig für Admin-Login im Hosting:**
- Wenn Frontend und API auf **unterschiedlichen Cloudflare-URLs** laufen, setze im Frontend-Deployment die Variable `API_ORIGIN` (alternativ `NEXT_PUBLIC_API_URL`) auf die API-URL, z. B. `https://hgh-app-api.<deine-domain>.workers.dev`.
- Cloudflare Dashboard: **Workers & Pages → (dein Frontend) → Settings → Variables and Secrets → Add variable**.
- Name: `API_ORIGIN` · Value: die komplette API-Origin ohne Pfad (z. B. `https://hgh-app-api.<deine-domain>.workers.dev`).
- Danach Frontend neu deployen, damit die Rewrites aktiv werden.
- Damit werden Browser-Requests auf `/api/*` serverseitig korrekt zur API weitergeleitet (inkl. Admin-Session-Cookies).

---

### Lokale Entwicklung

Für lokales Testen und Entwickeln:

```bash
npm run setup          # Alias für setup:init -- --local
npm run dev:api        # Startet die Worker-API (Terminal 1)
npm run dev            # Startet das Frontend (Terminal 2)
```

Dann im Browser öffnen: `http://localhost:3000`

**Lokaler Admin-Login:**
- Öffne `http://localhost:3000/admin`
- Benutzername: `redaktion`
- Passwort: `admin123`
- Beim ersten Login wird das Admin-Konto automatisch erstellt.

---

### Verfügbare Scripts

| Script | Was es tut |
|---|---|
| `npm run dev` | Startet das Frontend lokal (Port 3000) |
| `npm run dev:api` | Startet die Worker-API lokal (Port 8787) |
| `npm run dev:worker` | Startet den OpenNext-Entwicklungsserver (Port 8788) |
| `npm run build` | Baut die App für Produktion |
| `npm run deploy` | Deployed Frontend + API auf Cloudflare |
| `npm run deploy:web` | Deployed nur das Frontend |
| `npm run deploy:api` | Deployed nur die API |
| `npm run lint` | Prüft den Code auf Fehler (ESLint) |
| `npm run typecheck` | Prüft TypeScript-Typen |
| `npm run test:unit` | Führt automatische Tests aus |
| `npm run setup` | Alias für lokales Setup (`setup:init -- --local`) |
| `npm run setup:cloudflare` | Alias für Cloudflare-Setup (`setup:init -- --cloudflare`) |
| `npm run setup:init -- --cloudflare` | Zentraler Setup-Einstieg für Cloudflare (D1, R2, Secret, Migration) |
| `npm run setup:init -- --local` | Zentraler Setup-Einstieg für lokales Setup |
| `npm run db:migrate` | Wendet Datenbankänderungen an (Cloudflare) |
| `npm run db:migrate:local` | Wendet Datenbankänderungen lokal an |
