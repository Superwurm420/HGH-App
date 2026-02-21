# Admin-Guide: Welche Datei gehört wohin?

Dieser Guide ist für Personen ohne Programmierkenntnisse.

## Schnellübersicht (was du bearbeiten darfst)

| Bereich | Datei/Ordner | Erlaubte Formate | Zweck |
|---|---|---|---|
| Stundenplan (Hauptdaten) | `content/stundenplan.json` | `.json` | Aktiver Stundenplan, den die App anzeigt. |
| Stundenplan (PDF-Rohimport) | `content/stundenplan.pdf.raw.json` | `.json` | Rohdaten aus PDF-Parsing-Pipeline (technisch). |
| Stundenplan-PDF (Download-Link) | `assets/plan/` | `.pdf` | PDF-Dateien, die in der App als „PDF-Stundenplan“ geöffnet werden. |
| Kalender-Quellen | `content/kalender-quellen.txt` | `.txt` | Liste externer ICS-Kalender-URLs. |
| Lokaler Kalender | `content/kalender.ics` | `.ics` | Optionaler lokaler Kalender. |
| Ankündigungen (Einträge) | `assets/data/announcements/` | `.txt` | Einzelne Ankündigungstexte. |
| Ankündigungen (Index) | `assets/data/announcements/index.json` | `.json` | Steuert, welche Ankündigungen geladen werden. |
| TV-Ankündigungen Runtime | `assets/data/runtime/announcements.json` | `.json` | Laufzeitdaten für TV-Ansicht. |
| Klingelzeiten Runtime | `assets/data/runtime/bell-times.json` | `.json` | Laufzeitdaten für TV-Ansicht. |
| Fun-/Motivationsnachrichten | `assets/data/fun-messages.json` | `.json` | Texte für Countdown/Home-Karte. |
| TV-Slides Konfiguration | `assets/tv-slides/slides.json` | `.json` | Reihenfolge/Definition der TV-Slides. |
| Bilder allgemein | `assets/images/` | `.png`, `.jpg`, `.jpeg`, `.webp`, `.svg` | Freie Bildablage (wenn in UI referenziert). |
| Icons/PWA | `assets/icons/` | `.png`, `.svg`, `.ico` | App-Icons/Logos, die Manifest/Shell nutzen. |

## Konkrete Änderungsvorgänge

### 1) Stundenplan aktualisieren (einfachster Weg)
1. `content/stundenplan.json` ersetzen.
2. Optional neues PDF in `assets/plan/` hochladen.
3. Falls Dateiname neu ist: in `content/stundenplan.json` unter `meta.source` den PDF-Dateinamen setzen.

### 2) Kalender pflegen
- Externe Kalender über `content/kalender-quellen.txt` (eine URL pro Zeile).
- Lokale Termine über `content/kalender.ics`.

### 3) Ankündigungen pflegen
1. Neue `.txt`-Datei in `assets/data/announcements/` anlegen.
2. In `assets/data/announcements/index.json` eintragen/aktivieren.

### 4) Icons/Bilder ersetzen
- Icons, die von PWA/Manifest genutzt werden: in `assets/icons/` mit gleichem Dateinamen ersetzen.
- Sonstige Bilder: `assets/images/`.

## „Verschiedene Dateiformate akzeptieren“ – was ist aktuell möglich?

- **Kalender:** `*.ics` (plus URL-Liste in `kalender-quellen.txt`).
- **Ankündigungen:** `*.txt` (plus JSON-Index).
- **Stundenplan:** App-seitig `*.json` als Hauptquelle, plus PDF-Dateien in `assets/plan/` als Dokument-Link.
- **Icons/Bilder:** Web-übliche Bildformate (`png/jpg/webp/svg`, Icons zusätzlich `ico`).

Wichtig: Die Laufzeit verwendet **konkrete Pfade und Dateitypen**. Andere Formate funktionieren nur, wenn sie zusätzlich im Code/Config hinterlegt werden.

## Warum gibt es `_legacy`?

`_legacy/` enthält alte Tools, Parser-Experimente und frühere Workflows. Die produktive Laufzeit nutzt diesen Ordner nicht direkt.

### Empfehlung
Für maximale Einfachheit sollte `_legacy/` langfristig in ein separates Archiv-Repository oder einen eigenen Branch ausgelagert werden, damit Nicht-Programmierer im Hauptprojekt nur die wirklich relevanten Ordner sehen.
