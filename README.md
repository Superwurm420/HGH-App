# HGH-App — Der digitale Stundenplan

Die HGH-App ist die Stundenplan-App der **HGH Holztechnik und Gestaltung Hildesheim**. Sie zeigt den aktuellen Stundenplan, Ankündigungen, Termine und einen Kalender an — direkt im Browser, auf jedem Gerät.

---

## Für Nutzer: So nutzt du die App

1. **Öffne die App** im Browser auf deinem Handy, Tablet oder Computer.
2. **Wähle deine Klasse** aus (z. B. HT11, G21) — die Auswahl steht oben auf der Startseite und auf den Stundenplan-Seiten. Sie merkt sich deine Klasse auf diesem Gerät.
3. Auf der **Startseite** siehst du deinen heutigen Stundenplan, aktuelle Ankündigungen und einen Countdown.
4. Über die Navigation unten erreichst du weitere Bereiche:
   - **Tag** — tageweise Ansicht
   - **Woche** — die ganze Woche auf einen Blick
   - **Weiteres** — Zusatzinfos und Links

   Die **Pinnwand** mit allen aktuellen Ankündigungen erreichst du über den Link auf der Startseite.

### App auf dem Startbildschirm installieren

Die App lässt sich wie eine normale App auf dem Startbildschirm ablegen:

- **iPhone/iPad**: Tippe auf das Teilen-Symbol (Quadrat mit Pfeil nach oben) und dann auf „Zum Home-Bildschirm".
- **Android**: Tippe auf die drei Punkte im Browser-Menü und dann auf „Zum Startbildschirm hinzufügen" oder „App installieren".

---

## Für die Redaktion: Inhalte verwalten

Die Redaktion verwaltet Stundenpläne, Ankündigungen, Termine und Bilder über den **Adminbereich**:

1. Öffne die App im Browser
2. Hänge `/admin` an die Adresse an (z. B. `https://deine-app.de/admin`)
3. Melde dich an

**Ausführliche Anleitung:** [Admin-Anleitung (docs/ADMIN.md)](docs/ADMIN.md)

> **Nach der Ersteinrichtung das Passwort ändern:** Adminbereich → Einstellungen →
> *Passwort ändern*. Das Passwort aus der Einrichtung gilt sonst unbegrenzt weiter.

Tagesmeldungen und Ferienzeiträume pflegst du ebenfalls im Adminbereich, unter **Einstellungen**:

**Anleitung dazu:** [Tagesmeldungen und Ferienzeiten (docs/CONTENT_FORMATS.md)](docs/CONTENT_FORMATS.md)

---

## Für die IT-Betreuung

### Technik im Überblick

Die App läuft vollständig auf Cloudflare, in **einem** Worker:

- **Oberfläche und Schnittstelle**: Next.js 16, ausgeliefert als Cloudflare Worker
- **Datenbank**: Cloudflare D1 (SQLite) — Stundenpläne, Ankündigungen, Termine, Einstellungen
- **Dateien**: Cloudflare R2 — hochgeladene PDFs und Bilder

Es gibt keine getrennte API mehr und damit auch keine API-Adresse zu konfigurieren.
Deployment läuft automatisch über GitHub Actions.

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

Der zentrale Setup-Command übernimmt die Cloudflare-Anmeldung, D1/R2-Erstellung und die Migration. Am Ende bekommst du eine kompakte Checkliste (`DB`, `Bucket`, `Admin-Konto`, `Migration`).

> Ein Admin-Passwort wird hier **nicht** gesetzt und es gibt kein Secret dafür. Für den ersten Login gilt `Admin` / `admin`; das Konto entsteht dabei und bekommt sein eigenes Passwort direkt danach im Adminbereich.

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
3. Code prüfen (Lint, Typen, Tests)
4. App bauen
5. Auf Cloudflare deployen
6. Datenbank-Migrationen anwenden

> **Punkt 6 ist der wichtigste.** Ohne angewandte Migrationen ist die Datenbank
> leer: Dann ist kein Admin-Login möglich und die App zeigt überall
> „Kein Stundenplan verfügbar". Genau das war der Grund, warum die App
> zwischenzeitlich nicht funktioniert hat.

Danach ist die App unter der Cloudflare-URL erreichbar.

#### Schritt 6: Sofort anmelden und Passwort vergeben

**Das ist zeitkritisch.** Öffne direkt nach dem ersten erfolgreichen Deploy
`https://DEINE-URL/admin` und melde dich mit dem Benutzernamen aus
`wrangler.toml` (`ADMIN_USER`, Standard `Admin`) und dem Standardpasswort
`admin` an. Der Adminbereich lässt dich dann nichts anderes tun, als ein
Passwort zu vergeben.

Der Grund für die Eile: Bis zu dieser ersten Anmeldung gilt `Admin` / `admin`,
und die Seite ist öffentlich erreichbar. Das ist kein Passwort, das man raten
müsste — es steht hier in der Anleitung. Wer in diesem Fenster `/admin` aufruft,
legt das Konto selbst an und vergibt das Passwort. Das Fenster schließt sich in
dem Moment, in dem du dein eigenes Passwort gesetzt hast.

Ist es doch passiert — jemand hat sich das Konto geschnappt —, hilft nur der
Reset: das Konto löschen (siehe `docs/ADMIN.md`, Abschnitt „Passwort
vergessen") und die Anmeldung sofort erneut durchführen.

Es muss **keine** API-Adresse konfiguriert werden — Oberfläche und Schnittstelle
laufen im selben Worker unter derselben Adresse.

---

### Wichtig: nur ein Deploy-Weg

Das Deployment läuft über **GitHub Actions**. Das ist der einzige Weg, der auch
die Datenbank-Migration ausführt — und ein fehlender Migrationsschritt war die
Ursache dafür, dass die App zwischenzeitlich nichts mehr anzeigen konnte.

Cloudflare bietet zusätzlich eine eigene Git-Anbindung an („Workers Builds"),
die bei jedem Push selbst baut und deployed. Ist die aktiv, deployen **zwei
Systeme denselben Worker**: Sie überholen sich gegenseitig, und der Cloudflare-Weg
lässt die Migration aus. Welche Version am Ende live ist, wird damit zum Zufall.

**Prüfen und abschalten:**

1. [Cloudflare Dashboard](https://dash.cloudflare.com/) → **Compute (Workers)** → Worker **`hgh-app`**
2. Reiter **Settings** → Abschnitt **Build**
3. Steht dort ein verbundenes Repository, auf **Disconnect** (bzw. **Manage** → Verbindung trennen)

Danach deployed ausschließlich GitHub Actions. Erkennbar ist eine aktive
Cloudflare-Anbindung auch daran, dass ein Bot namens
*cloudflare-workers-and-pages* Deployment-Kommentare an Pull Requests schreibt.

### Lokale Entwicklung

Für lokales Testen und Entwickeln:

```bash
npm install
npm run setup          # migriert die lokale Datenbank
npm run dev            # startet alles — ein Terminal genügt
```

Dann im Browser öffnen: `http://localhost:3000`

**Lokaler Admin-Login:**
- Öffne `http://localhost:3000/admin`
- Benutzername: `Admin`, Passwort: `admin` (Groß-/Kleinschreibung des Namens ist beim Anmelden egal)
- Beim ersten Login wird das Admin-Konto angelegt; anschließend musst du ein Passwort vergeben, bevor der Adminbereich etwas zulässt.

Klappt die Anmeldung nicht, nennt die Anmeldeseite den Grund — meist fehlt die
Datenbank-Migration.

---

### Verfügbare Scripts

| Script | Was es tut |
|---|---|
| `npm run setup` | Lokale Ersteinrichtung: lokale Datenbank migrieren |
| `npm run dev` | Startet die App lokal inklusive Datenbank (Port 3000) |
| `npm run build` | Baut die App für die Produktion |
| `npm run preview` | Führt den gebauten Worker lokal aus |
| `npm run deploy` | Deployed die App auf Cloudflare |
| `npm run lint` | Prüft den Code (ESLint) |
| `npm run typecheck` | Prüft die TypeScript-Typen |
| `npm run test:unit` | Führt die automatischen Tests aus |
| `npm run setup:cloudflare` | Cloudflare-Ersteinrichtung (D1, R2, Migration) |
| `npm run db:migrate` | Wendet Datenbankänderungen auf Cloudflare an |
| `npm run db:migrate:local` | Wendet Datenbankänderungen lokal an |
