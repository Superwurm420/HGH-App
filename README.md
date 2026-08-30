# HGH-App — der digitale Stundenplan

Stundenplan-App der **HGH Holztechnik und Gestaltung Hildesheim**: Stundenplan,
Ankündigungen, Kalender und Wandbildschirm — im Browser, auf jedem Gerät.

| Du bist … | Lies … |
|---|---|
| Schülerin, Schüler, Lehrkraft | [Für Nutzer](#für-nutzer) — eine Seite, mehr braucht es nicht |
| Redaktion (Pläne und Ankündigungen pflegen) | [Admin-Anleitung](docs/ADMIN.md) |
| IT-Betreuung (einrichten und betreiben) | [Für die IT-Betreuung](#für-die-it-betreuung) |

---

## Für Nutzer

1. App im Browser öffnen.
2. **Klasse auswählen** (z. B. HT11) — oben auf der Startseite. Die Auswahl gilt
   für dieses Gerät und bleibt gespeichert.
3. Die Startseite zeigt den heutigen Plan, den Countdown und aktuelle
   Ankündigungen. Unten führt die Navigation zu **Tag**, **Woche** und
   **Weiteres**; die **Pinnwand** mit allen Ankündigungen ist von der Startseite
   verlinkt.

Unter **Weiteres** stehen Links, die Bildergalerie und ein Formular für
Rückmeldungen — Fehler, Wünsche, falsche Stundenpläne. Der Wandbildschirm in der
Schule läuft unter `/tv`.

**Auf den Startbildschirm legen:**

- **iPhone/iPad**: Teilen-Symbol → „Zum Home-Bildschirm“
- **Android**: Browser-Menü (drei Punkte) → „App installieren“

---

## Für die IT-Betreuung

### Technik im Überblick

Die App läuft vollständig auf Cloudflare, in **einem** Worker:

| Teil | Technik |
|---|---|
| Oberfläche und Schnittstelle | Next.js 16 als Cloudflare Worker |
| Datenbank | Cloudflare D1 (SQLite) — Pläne, Ankündigungen, Einstellungen |
| Dateien | Cloudflare R2 — hochgeladene PDFs und Bilder |

Oberfläche und API teilen sich Worker und Adresse: Es gibt keine API-URL zu
konfigurieren und außer `ADMIN_USER` in `wrangler.toml` keine Variable und kein
Secret. Deployt wird über GitHub Actions.

### Ersteinrichtung

Voraussetzungen: [Node.js](https://nodejs.org/) 20 oder neuer, ein
[Cloudflare-Account](https://dash.cloudflare.com/sign-up) (kostenloser Plan
genügt) und ein GitHub-Account.

**1. Code holen und Abhängigkeiten installieren**

```bash
git clone https://github.com/DEIN-ACCOUNT/HGH-App.git
cd HGH-App
npm install
```

**2. Cloudflare einrichten**

```bash
npm run setup:init -- --cloudflare
```

Das erledigt Anmeldung, D1-Datenbank, R2-Bucket und die erste Migration und
endet mit einer Checkliste (`DB`, `Bucket`, `Admin-Konto`, `Migration`).

**3. GitHub-Secrets hinterlegen**

Im Repository unter **Settings → Secrets and variables → Actions**:

| Secret | Woher |
|---|---|
| `CLOUDFLARE_API_TOKEN` | [Cloudflare → API Tokens](https://dash.cloudflare.com/profile/api-tokens), mit Rechten für Workers, D1 und R2 |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare-Dashboard, Übersichtsseite rechts |

**4. Deployen**

```bash
git push origin main
```

`.github/workflows/deploy.yml` prüft den Code (Lint, Typen, Tests), baut ihn,
deployt auf Cloudflare und wendet **danach die Datenbank-Migrationen an**.
Ohne diesen letzten Schritt bleibt D1 leer: kein Admin-Login, überall
„Kein Stundenplan verfügbar“.

**5. Sofort anmelden und ein Passwort vergeben**

Öffne direkt nach dem ersten Deploy `https://DEINE-URL/admin` und melde dich mit
`Admin` / `admin` an (Benutzername aus `ADMIN_USER`, Groß- und Kleinschreibung
egal). Der Adminbereich lässt dich dann zuerst ein eigenes Passwort setzen.

Das eilt: Bis zu dieser Anmeldung gilt das Standardpasswort, und `/admin` ist
öffentlich erreichbar — wer die Adresse kennt, kann sich das Konto nehmen. Die
erste Passwortvergabe schließt das Fenster. Ist es doch passiert, hilft nur der
Reset (siehe [Admin-Anleitung, „Passwort vergessen“](docs/ADMIN.md#passwort-vergessen))
und die sofortige erneute Anmeldung.

### Nur ein Deploy-Weg

Deployt wird über **GitHub Actions** — der einzige Weg, der auch die Migration
ausführt.

Cloudflare bietet zusätzlich eine eigene Git-Anbindung an („Workers Builds“).
Ist sie aktiv, deployen zwei Systeme denselben Worker; sie überholen sich
gegenseitig und der Cloudflare-Weg lässt die Migration aus. Welche Version live
ist, wird damit zum Zufall.

Prüfen und abschalten: [Cloudflare-Dashboard](https://dash.cloudflare.com/) →
**Compute (Workers)** → Worker `hgh-app` → **Settings** → **Build**. Steht dort
ein verbundenes Repository, die Verbindung trennen. Ein Hinweis auf eine aktive
Anbindung ist auch ein Bot namens *cloudflare-workers-and-pages*, der
Deployment-Kommentare an Pull Requests schreibt.

### Lokale Entwicklung

```bash
npm install
npm run setup          # lokale Datenbank migrieren
npm run dev            # App inklusive Datenbank, ein Terminal genügt
```

Dann `http://localhost:3000` öffnen; der Adminbereich liegt unter `/admin` und
verhält sich wie oben beschrieben (`Admin` / `admin`, danach eigenes Passwort).
Klappt die Anmeldung nicht, nennt die Anmeldeseite den Grund — meist fehlt die
Migration.

### Scripts

| Script | Was es tut |
|---|---|
| `npm run setup` | Lokale Ersteinrichtung: lokale Datenbank migrieren |
| `npm run setup:cloudflare` | Cloudflare-Ersteinrichtung (D1, R2, Migration) |
| `npm run dev` | App lokal starten (Port 3000) |
| `npm run build` | Produktions-Build |
| `npm run preview` | Gebauten Worker lokal ausführen |
| `npm run deploy` | Von Hand auf Cloudflare deployen |
| `npm run lint` · `typecheck` · `test:unit` | Code prüfen: ESLint, Typen, Tests |
| `npm run db:migrate` · `db:migrate:local` | Migrationen anwenden (Cloudflare / lokal) |
