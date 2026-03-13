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

#### Schritt 3: Bei Cloudflare anmelden

```bash
npx wrangler login
```

Daraufhin öffnet sich ein Browserfenster, in dem du dich bei Cloudflare anmeldest und den Zugriff bestätigst.

#### Schritt 4: Datenbank und Speicher erstellen

```bash
npx wrangler d1 create hgh-app-db
npx wrangler r2 bucket create hgh-app-content
```

Nach dem Erstellen der Datenbank zeigt die Konsole eine **Database-ID** an (eine lange Zeichenkette). Diese musst du in die Datei `worker/wrangler.toml` eintragen:

```toml
[[d1_databases]]
binding = "DB"
database_name = "hgh-app-db"
database_id = "HIER-DIE-ID-EINTRAGEN"
```

#### Schritt 5: Admin-Passwort festlegen

```bash
npx wrangler secret put ADMIN_PASSWORD -c worker/wrangler.toml
```

Du wirst aufgefordert, ein Passwort einzugeben. Das ist das Passwort, mit dem sich die Redaktion im Adminbereich anmeldet. Der Benutzername ist standardmäßig `redaktion` (konfiguriert in `worker/wrangler.toml` als `ADMIN_USER`).

#### Schritt 6: Datenbank-Tabellen anlegen

```bash
npm run db:migrate
```

#### Schritt 7: GitHub Secrets einrichten

Damit das automatische Deployment funktioniert, müssen im GitHub-Repository zwei Secrets hinterlegt werden:

1. Gehe im Repository zu **Settings** → **Secrets and variables** → **Actions**
2. Erstelle folgende Secrets:
   - **`CLOUDFLARE_API_TOKEN`** — Ein Cloudflare API Token mit Rechten für Workers, D1 und R2. Erstelle diesen unter [Cloudflare Dashboard → API Tokens](https://dash.cloudflare.com/profile/api-tokens).
   - **`CLOUDFLARE_ACCOUNT_ID`** — Deine Cloudflare Account-ID. Findest du im Cloudflare Dashboard auf der Übersichtsseite rechts.

#### Schritt 8: Erster Deploy

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

---

### Lokale Entwicklung

Für lokales Testen und Entwickeln:

```bash
npm run setup          # Erstellt .dev.vars mit lokalem Passwort (admin123)
npm run dev:api        # Startet die Worker-API (Terminal 1)
npm run dev            # Startet das Frontend (Terminal 2)
```

Dann im Browser öffnen: `http://localhost:3000`

**Lokaler Admin-Login:**
- Benutzername: `redaktion`
- Passwort: `admin123`

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
| `npm run setup` | Erstellt lokale Entwicklungsdateien |
| `npm run db:migrate` | Wendet Datenbankänderungen an (Cloudflare) |
| `npm run db:migrate:local` | Wendet Datenbankänderungen lokal an |
