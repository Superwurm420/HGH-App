# Admin-Guide: Welche Datei gehört wohin?

Dieser Guide ist für Personen ohne Programmierkenntnisse.

## Schnellübersicht (was du bearbeiten darfst)

| Bereich | Datei/Ordner | Erlaubte Formate | Zweck |
|---|---|---|---|
| Stundenplan (Hauptdaten) | `content/stundenplan.json` | `.json` | Aktiver Stundenplan, den die App anzeigt. |
| Stundenplan (PDF-Rohimport) | `content/stundenplan.pdf.raw.json` | `.json` | Rohdaten aus PDF-Parsing-Pipeline (technisch). |
| Stundenplan-PDF (Download-Link) | `content/timetables/` | `.pdf` | PDF-Dateien, die in der App als „PDF-Stundenplan“ geöffnet werden. |
| Kalender-Quellen | `content/txt/calendars/*.txt` | `.txt` | Liste externer ICS-Kalender-URLs. |
| Lokaler Kalender | `content/kalender.ics` | `.ics` | Optionaler lokaler Kalender. |
| Ankündigungen (Einträge) | `content/txt/events/` | `.txt` | Einzelne Ankündigungstexte. |
| Ankündigungen (Index) | `content/txt/events/files.txt` | `.txt` | Steuert, welche Ankündigungen geladen werden. |
| TV-Ankündigungen Runtime | `assets/data/runtime/announcements.json` | `.json` | Laufzeitdaten für TV-Ansicht. |
| Klingelzeiten Runtime | `assets/data/runtime/bell-times.json` | `.json` | Laufzeitdaten für TV-Ansicht. |
| Fun-/Motivationsnachrichten | `assets/data/fun-messages.json` | `.json` | Texte für Countdown/Home-Karte. |
| TV-Slides Konfiguration | `assets/tv-slides/slides.json` | `.json` | Reihenfolge/Definition der TV-Slides. |
| Bilder allgemein | `assets/images/` | `.png`, `.jpg`, `.jpeg`, `.webp`, `.svg` | Freie Bildablage (wenn in UI referenziert). |
| Icons/PWA | `assets/icons/` | `.png`, `.svg`, `.ico` | App-Icons/Logos, die Manifest/Shell nutzen. |

## Konkrete Änderungsvorgänge

### 1) Stundenplan aktualisieren (einfachster Weg)
1. `content/stundenplan.json` ersetzen.
2. Optional neues PDF in `content/timetables/` hochladen.
3. Falls Dateiname neu ist: in `content/stundenplan.json` unter `meta.source` den PDF-Dateinamen setzen.

### 2) Kalender pflegen
- Externe Kalender über `content/txt/calendars/*.txt` (eine URL pro Zeile).
- Lokale Termine über `content/kalender.ics`.

### 3) Ankündigungen pflegen
1. Neue `.txt`-Datei in `content/txt/events/` anlegen.
2. In `content/txt/events/files.txt` eintragen/aktivieren.

### 4) Icons/Bilder ersetzen
- Icons, die von PWA/Manifest genutzt werden: in `assets/icons/` mit gleichem Dateinamen ersetzen.
- Sonstige Bilder: `assets/images/`.

## „Verschiedene Dateiformate akzeptieren“ – was ist aktuell möglich?

- **Kalender:** `*.txt` in `content/txt/calendars/` (URL oder `Label|URL`) und optional `content/kalender.ics`.
- **Ankündigungen:** `*.txt` in `content/txt/events/` (gesteuert über `files.txt`).
- **Stundenplan:** App-seitig `*.json` als Hauptquelle, plus PDF-Dateien in `content/timetables/` als Dokument-Link.
- **Icons/Bilder:** Web-übliche Bildformate (`png/jpg/webp/svg`, Icons zusätzlich `ico`).

Wichtig: Die Laufzeit verwendet **konkrete Pfade und Dateitypen**. Andere Formate funktionieren nur, wenn sie zusätzlich im Code/Config hinterlegt werden.

## Warum gibt es `_legacy`?

`docs/archive/_legacy/` enthält alte Tools, Parser-Experimente und frühere Workflows. Die produktive Laufzeit nutzt diesen Ordner nicht direkt.

### Empfehlung
Für maximale Einfachheit sollte `docs/archive/_legacy/` langfristig in ein separates Archiv-Repository oder einen eigenen Branch ausgelagert werden, damit Nicht-Programmierer im Hauptprojekt nur die wirklich relevanten Ordner sehen.


## Manuelles Austauschen ohne Verlinkungen
- Lege/ersetze lokale Dateien direkt in `assets/icons/` und `assets/images/`.
- Behalte die Dateinamen aus der Konfiguration (z. B. `app-icon-192.svg`, `app-icon-512.svg`, `app-icon-512-maskable.svg`) bei, dann ist keine Code-Änderung nötig.
- Für spätere Bildwechsel einfach Datei überschreiben, Commit + Push.


## Verbindliche Logo-/Icon-Dateinamen (UI)

Diese Dateien werden im UI direkt verwendet und sollen bei Austausch den gleichen Namen behalten:
- `assets/icons/school-logo-header.svg` (Header-Logo)
- `assets/icons/school-logo-tv.svg` (TV-Ansicht Logo)
- `assets/icons/favicon-school.svg` (Browser-Favicon)
- `assets/icons/apple-touch-icon-school.svg` (iOS Homescreen Icon)
- `assets/icons/app-icon-192.svg` (PWA Icon 192)
- `assets/icons/app-icon-512.svg` (PWA Icon 512)
- `assets/icons/app-icon-512-maskable.svg` (PWA Maskable Icon)
- `assets/icons/class-photo-placeholder.svg` (Standard Klassenfoto-Platzhalter)
- `assets/icons/class-photo-ht11-placeholder.svg`
- `assets/icons/class-photo-ht12-placeholder.svg`
- `assets/icons/class-photo-ht21-placeholder.svg`
- `assets/icons/class-photo-ht22-placeholder.svg`

Regel für später: Datei mit gleichem Namen ersetzen (Format kann z. B. SVG/PNG/JPG sein, solange Pfad + Dateiname in den Referenzen gleich bleiben).
