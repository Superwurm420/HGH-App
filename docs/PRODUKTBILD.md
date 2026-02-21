# Produktbild (Soll-Zustand)

## Ziel
Diese App ist für **Schüler** gedacht.

Das Leitbild ist: **Plug-and-Play Pflege durch Schuladmins ohne Technikkenntnisse**.

Wenn sich etwas ändert, soll die zuständige Person nur die passende Datei austauschen oder ergänzen müssen.
Danach soll die App automatisch den neuen Stand anzeigen.

## Soll-Workflows (einfach und wiederholbar)

1. **Stundenplan aktualisieren**
   - Neue PDF bereitstellen.
   - App zeigt den neuen Stundenplan.

2. **Ankündigung/Termin veröffentlichen**
   - Eine Textdatei mit Inhalt anlegen oder austauschen.
   - Datei in die Aktiv-Liste eintragen.
   - App zeigt den neuen Eintrag.

3. **Kalender hinzufügen/ändern**
   - Kalender-Eintrag in einer Textdatei pflegen.
   - App übernimmt den Kalender automatisch.

4. **Medien/Branding austauschen**
   - Logo, Icons oder Bilder ersetzen.
   - App zeigt die neuen Medien ohne Codeänderung.

## Pflichtprinzipien

- **Keine Codeänderung** für normale Inhalte.
- **Klare Dateipfade** für jeden Bearbeitungsfall.
- **Gleiche Dateinamen beibehalten**, wenn Dateien ersetzt werden.
- **Wenige Schritte, klare Wirkung** (Datei rein, App aktuell).

## Bearbeitungs-Pfade (Schnellübersicht)

### Stundenplan
- `content/timetables/` (Stundenplan-PDF ersetzen)

### Kalender
- `content/txt/calendars/files.txt`
- `content/txt/calendars/schule.txt`
- `content/txt/calendars/klasse-hgt2.txt`
- `content/txt/calendars/ferien.txt`

### Ankündigungen / Termine
- `content/txt/events/files.txt`
- `content/txt/events/vorlage-mit-termin.txt`
- `content/txt/events/vorlage-ohne-datum.txt`
- `content/txt/events/*.txt`

### TV-/Laufzeitdaten
- `assets/data/runtime/announcements.json`
- `assets/data/runtime/bell-times.json`
- `assets/tv-slides/slides.json`

### Bilder
- `assets/images/`
- `content/images/` (falls im Betrieb genutzt)

### Logo / Icons
- `assets/icons/school-logo-header.svg`
- `assets/icons/school-logo-tv.svg`
- `assets/icons/favicon-school.svg`
- `assets/icons/apple-touch-icon-school.svg`
- `assets/icons/app-icon-192.svg`
- `assets/icons/app-icon-512.svg`
- `assets/icons/app-icon-512-maskable.svg`

## Verbindliche Admin-Perspektive

Für die tägliche Pflege zählt nur:
1. Richtige Datei finden
2. Datei austauschen oder ergänzen
3. Änderungen bereitstellen
4. Seite neu laden

Mehr ist im Soll-Zustand nicht nötig.
