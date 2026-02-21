# 5-Minuten-Anleitung für Schuladmins (ohne Technik)

Ziel: Inhalte schnell aktualisieren, ohne Code zu ändern.

## 1) Stundenplan aktualisieren (ca. 1–2 Minuten)

1. Neue Stundenplan-PDF bereitstellen.
2. PDF in `content/timetables/` mit dem erwarteten Dateinamen ersetzen.
3. Änderungen speichern/veröffentlichen.
4. (Maintainer/CI) `node scripts/generate-sw-assets.mjs` ausführen, damit automatisch die neueste PDF als Referenz gesetzt wird.
5. Seite neu laden.

**Ergebnis:** Der neue Stundenplan ist sichtbar (immer mit Referenz auf die neueste PDF).

Wenn keine gültige Stundenplan-Datei vorhanden ist, zeigt die App einen leeren Hinweiszustand statt eines Absturzes.

---

## 2) Termin/Ankündigung erstellen (ca. 1 Minute)

1. Vorlage kopieren:
   - `content/txt/events/vorlage-mit-termin.txt` oder
   - `content/txt/events/vorlage-ohne-datum.txt`
2. Inhalt ausfüllen und als neue Datei in `content/txt/events/` speichern.
3. Dateinamen in `content/txt/events/files.txt` als neue Zeile eintragen.
4. Änderungen speichern/veröffentlichen, Seite neu laden.

**Ergebnis:** Die Ankündigung ist in der App sichtbar.

---

## 3) Kalender hinzufügen (ca. 1 Minute)

1. Datei öffnen: `content/txt/calendars/files.txt`
2. Neue Zeile eintragen im Format:
   - `Name|ICS-URL`
3. Änderungen speichern/veröffentlichen, Seite neu laden.

**Ergebnis:** Der neue Kalender ist eingebunden.

---

## 4) Logos, Icons oder Bilder austauschen (ca. 1 Minute)

1. Bestehende Datei durch neue Datei ersetzen.
2. **Wichtig:** Gleichen Dateinamen behalten.
3. Relevante Pfade:
   - Logos/Icons: `assets/icons/`
   - Bilder: `assets/images/`
   - TV-Hintergrund (Referenz nur hier): `assets/icons/tv-background.jpg`
   - TV-Slides: Dateien nur in `assets/tv-slides/` ablegen (Dateinamen frei, Liste wird automatisch erzeugt)

**Ergebnis:** Neue Grafik erscheint automatisch.

---

## 5) Kurz-Check: Hat es funktioniert?

- Seite im Browser neu laden (bei Bedarf Hard-Reload).
- Prüfen:
  - Stundenplan korrekt?
  - Neuer Termin sichtbar?
  - Neuer Kalender sichtbar?
  - Grafik aktualisiert?

Wenn ja: Fertig.
