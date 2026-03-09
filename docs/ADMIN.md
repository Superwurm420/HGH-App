# Admin-Handbuch — HGH-App

Diese Anleitung erklärt, wie man die HGH-App einrichtet und den Adminbereich nutzt. Auch ohne Programmierkenntnisse.

---

## Inhaltsverzeichnis

1. [Einrichtung](#1-einrichtung)
2. [Erster Login](#2-erster-login)
3. [Den Adminbereich nutzen](#3-den-adminbereich-nutzen)
4. [Lokale Entwicklung](#4-lokale-entwicklung)
5. [Häufige Probleme und Lösungen](#5-häufige-probleme-und-lösungen)
6. [Manuelle Einrichtung (Referenz)](#6-manuelle-einrichtung-referenz)

---

## 1. Einrichtung

### Was du brauchst

- **Node.js** (Version 18 oder neuer) — [nodejs.org](https://nodejs.org) herunterladen und installieren
- Ein **Cloudflare-Konto** (kostenlos) — auf [dash.cloudflare.com](https://dash.cloudflare.com) registrieren

> **Tipp:** Prüfe ob Node.js installiert ist: Öffne ein Terminal und tippe `node --version`. Es sollte eine Versionsnummer erscheinen (z. B. `v20.11.0`).

### Setup-Skript ausführen

Das Setup-Skript erledigt alles automatisch für dich:

```bash
npm run setup
```

**Was passiert dabei?**

1. Abhängigkeiten werden installiert
2. Dein Browser öffnet sich zur Cloudflare-Anmeldung (falls nötig)
3. Die Datenbank wird erstellt und eingerichtet
4. Der Dateispeicher für PDFs wird erstellt
5. Ein Session-Geheimnis wird automatisch generiert
6. Du wirst nach einem **Admin-Passwort** gefragt — merke es dir!
7. Die lokale Entwicklungsumgebung wird vorbereitet

### App veröffentlichen

```bash
npm run deploy
```

Danach zeigt dir das Terminal die URL, unter der die App erreichbar ist.

> **Hinweis:** Der Admin-Benutzername ist standardmäßig `redaktion`. Falls du ihn ändern möchtest, bearbeite die Datei `wrangler.toml` und ändere den Wert bei `ADMIN_USER`.

---

## 2. Erster Login

Beim allerersten Login erstellt die App automatisch das Admin-Konto. Du musst keinen Benutzer manuell anlegen.

### So geht's

1. Öffne die App im Browser und navigiere zu `/admin`
   (z. B. `https://deine-app.workers.dev/admin`).

2. Du siehst das Anmeldeformular:
   - **Benutzername:** `redaktion` (oder was du in `wrangler.toml` eingestellt hast)
   - **Passwort:** Das Passwort, das du beim Setup eingegeben hast

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

## 3. Den Adminbereich nutzen

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

## 4. Lokale Entwicklung

Wenn du `npm run setup` ausgeführt hast, ist die lokale Entwicklung bereits vorbereitet. Du brauchst nur zwei Terminals:

```bash
# Terminal 1 — Backend
npm run dev:worker

# Terminal 2 — Frontend
npm run dev
```

Dann öffne [http://localhost:3000](http://localhost:3000).

### Lokaler Admin-Login

Das Setup-Skript erstellt automatisch eine `.dev.vars`-Datei mit einem lokalen Passwort. Logge dich ein mit:
- **Benutzername:** `redaktion`
- **Passwort:** `admin123`

> **Hinweis:** Falls du die `.dev.vars`-Datei manuell erstellen musst:
> ```
> ADMIN_PASSWORD=admin123
> SESSION_SECRET=ein-beliebiger-geheimer-schluessel
> ```

---

## 5. Häufige Probleme und Lösungen

### „Ungültige Anmeldedaten" beim ersten Login

- **Benutzername prüfen:** Ist er genau `redaktion` (oder der Wert in `wrangler.toml`)? Groß-/Kleinschreibung beachten.
- **Passwort prüfen:** Stimmt es mit dem Passwort überein, das du beim Setup eingegeben hast?
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

---

## 6. Manuelle Einrichtung (Referenz)

Falls das Setup-Skript nicht funktioniert oder du die Schritte einzeln ausführen willst:

```bash
# 1. Abhängigkeiten installieren
npm install

# 2. Bei Cloudflare anmelden
npx wrangler login

# 3. Datenbank erstellen
npx wrangler d1 create hgh-app-db
#    → Die angezeigte database_id in wrangler.toml eintragen

# 4. Dateispeicher erstellen
npx wrangler r2 bucket create hgh-app-content

# 5. Tabellen anlegen
npm run db:migrate

# 6. Session-Geheimnis setzen (beliebige lange Zeichenkette)
npx wrangler secret put SESSION_SECRET

# 7. Admin-Passwort setzen
npx wrangler secret put ADMIN_PASSWORD

# 8. App veröffentlichen
npm run deploy
```

| Einstellung | Wo? | Beschreibung |
|-------------|-----|--------------|
| `ADMIN_USER` | `wrangler.toml` → `[vars]` | Benutzername (Standard: `redaktion`) |
| `ADMIN_PASSWORD` | Cloudflare Secret | Passwort für den Admin-Login |
| `SESSION_SECRET` | Cloudflare Secret | Geheimer Schlüssel für Sitzungscookies |
