# Admin-Handbuch — HGH-App

Diese Anleitung erklärt Schritt für Schritt, wie man die HGH-App einrichtet und den Adminbereich nutzt. Sie richtet sich an alle, die die App betreiben — auch ohne tiefe Programmierkenntnisse.

---

## Inhaltsverzeichnis

1. [Was wird gebraucht?](#1-was-wird-gebraucht)
2. [Cloudflare-Konto einrichten](#2-cloudflare-konto-einrichten)
3. [Wrangler installieren und anmelden](#3-wrangler-installieren-und-anmelden)
4. [Datenbank erstellen (D1)](#4-datenbank-erstellen-d1)
5. [Dateispeicher erstellen (R2)](#5-dateispeicher-erstellen-r2)
6. [Passwort und Geheimnisse setzen](#6-passwort-und-geheimnisse-setzen)
7. [App bereitstellen (Deployment)](#7-app-bereitstellen-deployment)
8. [Erster Login — Admin-Konto wird automatisch erstellt](#8-erster-login--admin-konto-wird-automatisch-erstellt)
9. [Den Adminbereich nutzen](#9-den-adminbereich-nutzen)
10. [Lokale Entwicklung](#10-lokale-entwicklung)
11. [Häufige Probleme und Lösungen](#11-häufige-probleme-und-lösungen)

---

## 1. Was wird gebraucht?

Bevor es losgeht, brauchst du folgende Dinge auf deinem Computer:

| Was? | Wozu? | Installation |
|------|-------|--------------|
| **Node.js** (Version 18+) | Führt die App und Werkzeuge aus | [nodejs.org](https://nodejs.org) |
| **npm** | Installiert Abhängigkeiten (kommt mit Node.js) | Wird mit Node.js installiert |
| **Ein Cloudflare-Konto** | Hostet die App, Datenbank und Dateien | [dash.cloudflare.com](https://dash.cloudflare.com) — kostenlos |

> **Tipp:** Du kannst prüfen, ob Node.js installiert ist, indem du in einem Terminal `node --version` eingibst. Es sollte eine Versionsnummer erscheinen (z. B. `v20.11.0`).

---

## 2. Cloudflare-Konto einrichten

1. Öffne [dash.cloudflare.com](https://dash.cloudflare.com) in deinem Browser.
2. Klicke auf **Sign Up** und erstelle ein Konto mit deiner E-Mail-Adresse.
3. Bestätige deine E-Mail-Adresse über den zugesendeten Link.

Das Konto ist kostenlos. Die Dienste, die wir nutzen (Workers, D1, R2), sind im kostenlosen Kontingent enthalten.

---

## 3. Wrangler installieren und anmelden

**Wrangler** ist das Kommandozeilen-Werkzeug von Cloudflare. Damit wird die App bereitgestellt und konfiguriert.

Öffne ein Terminal (z. B. PowerShell unter Windows, Terminal unter macOS/Linux) und führe aus:

```bash
# Wrangler global installieren
npm install -g wrangler

# Bei Cloudflare anmelden (öffnet einen Browser)
wrangler login
```

Nach `wrangler login` öffnet sich dein Browser. Melde dich dort mit deinem Cloudflare-Konto an und erlaube den Zugriff. Danach kannst du das Browserfenster schließen.

> **Prüfen ob es geklappt hat:**
> ```bash
> wrangler whoami
> ```
> Hier sollte dein Cloudflare-Kontoname erscheinen.

---

## 4. Datenbank erstellen (D1)

Die App speichert alle Daten (Stundenpläne, Ankündigungen, Termine, Benutzer) in einer **D1-Datenbank**. Das ist eine SQLite-Datenbank, die bei Cloudflare läuft.

### Datenbank anlegen

```bash
wrangler d1 create hgh-app-db
```

Die Ausgabe sieht ungefähr so aus:

```
✅ Successfully created DB 'hgh-app-db'

[[d1_databases]]
binding = "DB"
database_name = "hgh-app-db"
database_id = "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
```

### Database-ID in die Konfiguration eintragen

Öffne die Datei `wrangler.toml` im Hauptverzeichnis des Projekts und ersetze den Platzhalter bei `database_id` durch die ID aus der Ausgabe oben:

```toml
[[d1_databases]]
binding = "DB"
database_name = "hgh-app-db"
database_id = "a1b2c3d4-e5f6-7890-abcd-ef1234567890"  # ← Deine echte ID hier einsetzen
```

### Tabellen erstellen (Migration)

Die Datenbank ist noch leer. Die Tabellen werden durch eine Migration erstellt:

```bash
# Für die Produktion (auf Cloudflare):
npm run db:migrate

# Für lokale Entwicklung (auf deinem Computer):
npm run db:migrate:local
```

> **Was passiert hier?** Der Befehl führt die Datei `migrations/0001_initial_schema.sql` aus. Diese erstellt alle nötigen Tabellen: Benutzer, Sitzungen, Klassen, Stundenpläne, Ankündigungen, Termine und mehr.

---

## 5. Dateispeicher erstellen (R2)

Hochgeladene PDF-Stundenpläne werden in einem **R2-Bucket** gespeichert. Das ist ein Dateispeicher bei Cloudflare.

```bash
wrangler r2 bucket create hgh-app-content
```

Der Name `hgh-app-content` muss mit dem Eintrag in `wrangler.toml` übereinstimmen (ist bereits vorkonfiguriert):

```toml
[[r2_buckets]]
binding = "STORAGE"
bucket_name = "hgh-app-content"
```

---

## 6. Passwort und Geheimnisse setzen

Die App braucht ein Admin-Passwort und einen geheimen Schlüssel für Sitzungen. Diese werden als **Secrets** gespeichert — sie sind nur auf dem Server verfügbar und nie im Code sichtbar.

### Admin-Passwort setzen

```bash
wrangler secret put ADMIN_PASSWORD
```

Du wirst aufgefordert, das Passwort einzugeben. **Dieses Passwort brauchst du später für den ersten Login.** Wähle ein sicheres Passwort und merke es dir.

> **Hinweis:** Das Passwort erscheint nicht auf dem Bildschirm während du es eingibst — das ist normal und ein Sicherheitsmerkmal.

### Session-Geheimnis setzen

```bash
wrangler secret put SESSION_SECRET
```

Gib hier eine beliebige, lange Zeichenkette ein (z. B. 32+ zufällige Zeichen). Dieser Schlüssel wird intern zur Absicherung der Admin-Sitzungen verwendet.

> **Tipp:** Du kannst mit diesem Befehl einen zufälligen Schlüssel erzeugen und kopieren:
> ```bash
> node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
> ```

### Admin-Benutzername (optional ändern)

Der Benutzername ist standardmäßig auf `redaktion` gesetzt. Du findest ihn in der Datei `wrangler.toml`:

```toml
[vars]
ADMIN_USER = "redaktion"
```

Falls du einen anderen Benutzernamen möchtest, ändere den Wert hier. Für die meisten Fälle ist `redaktion` passend.

### Zusammenfassung der Konfiguration

| Einstellung | Wo? | Standard | Beschreibung |
|-------------|-----|----------|--------------|
| `ADMIN_USER` | `wrangler.toml` → `[vars]` | `redaktion` | Benutzername für den Admin-Login |
| `ADMIN_PASSWORD` | Cloudflare Secret | — (muss gesetzt werden) | Passwort für den Admin-Login |
| `SESSION_SECRET` | Cloudflare Secret | — (muss gesetzt werden) | Geheimer Schlüssel für Sitzungscookies |

---

## 7. App bereitstellen (Deployment)

Wenn alles konfiguriert ist, kann die App auf Cloudflare veröffentlicht werden:

```bash
# 1. Abhängigkeiten installieren (falls noch nicht geschehen)
npm install

# 2. App bereitstellen
npm run deploy
```

Nach erfolgreichem Deployment zeigt Wrangler die URL an, unter der die App erreichbar ist.

---

## 8. Erster Login — Admin-Konto wird automatisch erstellt

Beim allerersten Login erstellt die App automatisch das Admin-Konto. Du musst keinen Benutzer manuell anlegen.

### So geht's

1. Öffne die App im Browser und navigiere zu `/admin`
   (z. B. `https://deine-app.workers.dev/admin`).

2. Du siehst das Anmeldeformular:
   - **Benutzername:** `redaktion` (oder was du in `wrangler.toml` eingestellt hast)
   - **Passwort:** Das Passwort, das du mit `wrangler secret put ADMIN_PASSWORD` gesetzt hast

3. Klicke auf **Anmelden**.

4. Beim ersten Login passiert Folgendes automatisch im Hintergrund:
   - Die App prüft, ob bereits ein Benutzer existiert.
   - Da noch kein Benutzer vorhanden ist, wird ein Admin-Konto mit deinem Benutzernamen und Passwort angelegt.
   - Das Passwort wird dabei sicher verschlüsselt gespeichert (PBKDF2-SHA256).
   - Du wirst sofort eingeloggt.

5. Ab jetzt bist du als Admin angemeldet und kannst den Adminbereich nutzen.

> **Wichtig:** Das Auto-Setup funktioniert nur einmal — beim allerersten Login, wenn noch keine Benutzer in der Datenbank existieren. Danach wird der Login ganz normal über Benutzername und Passwort geprüft.

### Sitzungsdauer

Nach dem Login bist du **12 Stunden** angemeldet. Danach musst du dich erneut einloggen. Du kannst dich auch jederzeit manuell über den **Abmelden**-Button abmelden.

---

## 9. Den Adminbereich nutzen

Nach dem Login siehst du den Adminbereich mit drei Reitern (Tabs):

### Tab 1: Stundenplan

Hier verwaltest du die Stundenpläne.

#### PDF hochladen

1. Klicke auf **Durchsuchen** und wähle eine PDF-Datei aus.
2. Klicke auf **Hochladen**.
3. Die Datei wird automatisch hochgeladen und geparst (ausgelesen).

**Dateiname:** Damit die App die Kalenderwoche und das Halbjahr erkennt, sollte der Dateiname diesem Muster folgen:

```
Stundenplan_kw_XX_HjY_YYYY_YY.pdf
```

| Platzhalter | Bedeutung | Beispiel |
|-------------|-----------|----------|
| `XX` | Kalenderwoche | `03` |
| `Y` | Halbjahr (1 oder 2) | `2` |
| `YYYY_YY` | Schuljahr | `2025_26` |

**Beispiel:** `Stundenplan_kw_03_Hj2_2025_26.pdf`

> **Tipp:** Die App akzeptiert auch andere Dateinamen, kann dann aber Kalenderwoche und Halbjahr nicht automatisch zuordnen.

#### Status eines Uploads

Nach dem Hochladen durchläuft ein Upload mehrere Status:

| Status | Bedeutung | Was tun? |
|--------|-----------|----------|
| **Hochgeladen** | Datei ist auf dem Server | Warten — Parsing startet automatisch |
| **Wird geparst** | Stundenplandaten werden aus dem PDF gelesen | Kurz warten |
| **Bereit zur Aktivierung** | Parsing war erfolgreich | Auf **Aktivieren** klicken |
| **Aktiv** | Dieser Stundenplan wird den Schülern angezeigt | Fertig — nichts weiter nötig |
| **Fehler** | Beim Parsing ist etwas schiefgegangen | Fehlermeldung lesen, ggf. andere PDF-Datei probieren |
| **Archiviert** | War vorher aktiv, wurde durch einen neuen Plan ersetzt | Kann gelöscht werden |

#### Stundenplan aktivieren

- Nur Uploads mit Status **Bereit zur Aktivierung** können aktiviert werden.
- Klicke auf den grünen **Aktivieren**-Button neben dem Upload.
- Der vorherige aktive Plan wird automatisch archiviert.
- Ab sofort sehen alle Schüler den neuen Stundenplan.

#### Upload löschen

- Klicke auf **Löschen** neben einem Upload (außer dem aktiven Plan).
- Du wirst zur Bestätigung gefragt.

### Tab 2: Ankündigungen

Hier erstellst und verwaltest du Ankündigungen, die auf der Pinnwand und der Startseite erscheinen.

Für jede Ankündigung kannst du festlegen:
- **Titel und Inhalt** der Nachricht
- **Ablaufdatum** — danach verschwindet die Ankündigung automatisch
- **Zielgruppe** — alle Schüler oder nur bestimmte Klassen
- **Hervorheben** — die Ankündigung wird optisch hervorgehoben

### Tab 3: Termine

Hier verwaltest du Termine, die im Kalender der App erscheinen.

Für jeden Termin kannst du festlegen:
- **Titel und Beschreibung**
- **Start- und Enddatum**
- **Ganztägig** ja/nein
- **Kategorie** (Allgemein, Klausur, Feiertag, Projekt, Sonstiges)
- **Zielgruppe** — bestimmte Klassen oder alle

---

## 10. Lokale Entwicklung

Für die Entwicklung auf deinem eigenen Computer brauchst du zwei Terminals.

### Terminal 1 — Backend starten

```bash
npm run dev:worker
```

Startet den Cloudflare Worker lokal auf `http://localhost:8787`. Dabei werden D1 und R2 lokal simuliert.

> **Wichtig:** Für die lokale Entwicklung musst du vorher die lokale Migration ausführen:
> ```bash
> npm run db:migrate:local
> ```

### Terminal 2 — Frontend starten

```bash
npm run dev
```

Startet das Next.js-Frontend auf `http://localhost:3000`. API-Aufrufe (`/api/*`) werden automatisch an den Worker auf Port 8787 weitergeleitet.

### Lokaler Admin-Login

Für den lokalen Login musst du `ADMIN_PASSWORD` als Umgebungsvariable setzen. Da lokale Worker keine Cloudflare Secrets haben, nutze eine `.dev.vars`-Datei im Projektverzeichnis:

1. Erstelle eine Datei `.dev.vars` im Hauptverzeichnis:
   ```
   ADMIN_PASSWORD=dein-lokales-passwort
   SESSION_SECRET=ein-beliebiger-geheimer-schluessel
   ```

2. Starte den Worker neu (`npm run dev:worker`).

3. Logge dich unter `http://localhost:3000/admin` ein mit:
   - Benutzername: `redaktion`
   - Passwort: `dein-lokales-passwort`

> **Hinweis:** Die Datei `.dev.vars` sollte **nicht** in Git eingecheckt werden (sie ist in `.gitignore` aufgeführt).

---

## 11. Häufige Probleme und Lösungen

### „Ungültige Anmeldedaten" beim ersten Login

- **Benutzername prüfen:** Ist er genau `redaktion` (oder der Wert in `wrangler.toml`)? Groß-/Kleinschreibung beachten.
- **Passwort prüfen:** Stimmt es mit dem Wert überein, den du bei `wrangler secret put ADMIN_PASSWORD` eingegeben hast?
- **Migration ausgeführt?** Ohne Migration existiert die `users`-Tabelle nicht. Führe `npm run db:migrate` aus.

### „Ungültige Anmeldedaten" nach dem ersten Login

- Das Auto-Setup funktioniert nur beim allerersten Login. Danach wird das in der Datenbank gespeicherte Passwort geprüft.
- Wenn du das Passwort ändern willst, musst du die Datenbank zurücksetzen (siehe unten).

### Passwort vergessen — Admin zurücksetzen

Wenn du dein Admin-Passwort vergessen hast:

1. Setze ein neues Passwort als Secret:
   ```bash
   wrangler secret put ADMIN_PASSWORD
   ```

2. Lösche den bestehenden Admin-Benutzer aus der Datenbank:
   ```bash
   wrangler d1 execute hgh-app-db --command "DELETE FROM sessions; DELETE FROM users;"
   ```

3. Logge dich erneut unter `/admin` ein — das Auto-Setup erstellt den Benutzer neu.

### PDF-Upload zeigt Status „Fehler"

- **Dateiformat:** Ist die Datei wirklich ein PDF? Die App prüft den Dateiinhalt, nicht nur die Endung.
- **Dateigröße:** Maximal 20 MB sind erlaubt.
- **PDF-Inhalt:** Der Parser erwartet ein bestimmtes Stundenplan-Format. Nicht jedes PDF kann automatisch gelesen werden. Die Fehlermeldung unter dem Upload gibt Hinweise.

### Lokaler Worker startet nicht

- Sind alle Abhängigkeiten installiert? Führe `npm install` aus.
- Ist Port 8787 frei? Ein anderer Prozess könnte ihn bereits belegen.
- Wurde die lokale Migration ausgeführt? → `npm run db:migrate:local`

### Änderungen erscheinen nicht im Frontend

- Hast du den neuen Stundenplan **aktiviert**? Nur der aktive Plan wird Schülern angezeigt.
- Browser-Cache leeren oder eine harte Aktualisierung durchführen (Strg+Shift+R / Cmd+Shift+R).
