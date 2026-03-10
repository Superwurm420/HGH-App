# Admin-Anleitung (für Laien)

Diese Anleitung erklärt den Adminbereich **ohne Fachsprache**.

---

## Kurzüberblick

Im Adminbereich gibt es 3 Hauptbereiche:
1. **Stundenplan** (PDF hochladen und aktivieren)
2. **Ankündigungen** (Nachrichten veröffentlichen)
3. **Termine** (Kalendereinträge pflegen)

---

## 1) Anmeldung

1. Öffne die App im Browser.
2. Gehe auf `/admin`.
3. Melde dich an mit:
   - Benutzername: `redaktion` (Standard)
   - Passwort: das Passwort aus der Einrichtung

> Beim ersten Login wird das Adminkonto automatisch erstellt.

---

## 2) Stundenplan verwalten

### Neuen Stundenplan hochladen

1. Im Tab **Stundenplan** auf **Durchsuchen** klicken.
2. PDF auswählen.
3. **Hochladen** klicken.
4. Warten, bis der Status **Bereit zur Aktivierung** erscheint.
5. **Aktivieren** klicken.

Erst nach dem Aktivieren sehen Schülerinnen und Schüler den neuen Plan.

### Dateiname (empfohlen)

Damit Woche und Halbjahr automatisch erkannt werden, nutze möglichst dieses Muster:

`Stundenplan_kw_XX_HjY_YYYY_YY.pdf`

Beispiel:
`Stundenplan_kw_03_Hj2_2025_26.pdf`

### Bedeutung der Status

- **Hochgeladen** → Datei ist angekommen
- **Wird geparst** → Datei wird gelesen
- **Bereit zur Aktivierung** → alles ok, kann live geschaltet werden
- **Aktiv** → wird den Schülern angezeigt
- **Fehler** → Datei konnte nicht korrekt verarbeitet werden
- **Archiviert** → alter Plan, nicht mehr aktiv

---

## 3) Ankündigungen verwalten

Im Tab **Ankündigungen** kannst du Meldungen erstellen.

Du legst fest:
- Titel,
- Text,
- optionales Ablaufdatum,
- Zielgruppe (alle oder bestimmte Klassen),
- optional „hervorgehoben“.

Nach dem Speichern ist die Meldung sichtbar.

---

## 4) Termine verwalten

Im Tab **Termine** kannst du Kalender-Einträge anlegen.

Du legst fest:
- Titel,
- Beschreibung,
- Start und Ende,
- ganztägig ja/nein,
- Kategorie,
- Zielgruppe.

---

## 5) Häufige Probleme

### „Ungültige Anmeldedaten“
- Benutzername prüfen (`redaktion`, falls nicht geändert)
- Passwort prüfen
- wenn frisch eingerichtet: ggf. Setup/Deployment erneut ausführen

### Upload steht auf „Fehler“
- prüfen, ob es wirklich ein PDF ist
- prüfen, ob Datei nicht zu groß ist
- ggf. PDF neu exportieren und erneut hochladen

### Änderungen sind nicht sichtbar
- wurde der neue Stundenplan wirklich **aktiviert**?
- Browser-Seite neu laden (ggf. mit hartem Reload)

---

## 6) Lokal testen (für Betreuung/Fehlersuche)

```bash
# Terminal 1
npm run dev:api

# Terminal 2
npm run dev
```

Dann öffnen: http://localhost:3000

Lokaler Admin-Login:
- Benutzername: `redaktion`
- Passwort: `admin123`

---

## 7) Wenn du gar nicht weiterkommst

1. Screenshot von Fehlermeldung machen.
2. Notieren, was du direkt davor gemacht hast.
3. Diese Infos an die technische Betreuung weitergeben.

So kann der Fehler meist schnell gelöst werden.
