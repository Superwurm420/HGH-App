# HGH – Schüler-PWA

Minimal gehaltene Schul-PWA (Vanilla HTML/CSS/JS) für GitHub Pages.

## Setup / Entwicklung

- Lokaler Test (ohne Build):
  ```bash
  python3 -m http.server 8080
  # dann: http://127.0.0.1:8080
  ```

## Aktive Struktur (Stand: Refactor)

```text
/
├─ index.html
├─ app.css
├─ src/
│  ├─ app.js                      # App entry (ESM)
│  ├─ config/
│  │  └─ paths.js                 # zentrale Pfade/URLs
│  ├─ data/
│  │  └─ timetable-source.js      # Quelle + Fallback-Steuerung
│  ├─ modules/
│  │  └─ timetable-parser.js      # JSON-Normalisierung
│  ├─ parsers/
│  │  └─ pdf/
│  │     └─ pdf-timetable-v2.js   # PDF Parser V2 Pipeline
│  └─ utils/
│     ├─ dom.js
│     ├─ storage.js
│     └─ text.js
├─ manifest.json
├─ service-worker.js
├─ content/
│  ├─ stundenplan.json
│  ├─ txt/
│  │  ├─ calendars/
│  │  └─ events/
│  ├─ timetables/
│  └─ README_admin.txt
├─ assets/
│  ├─ data/
│  │  ├─ announcements/
│  │  ├─ fun-messages.json
│  │  └─ runtime/                  # ehemals /data
│  │     ├─ announcements.json
│  │     └─ bell-times.json
│  ├─ icons/
│  ├─ images/
│  ├─ plan/
│  └─ tv-slides/
├─ tests/
│  ├─ fixtures/
│  └─ pdf-parser-v2.test.mjs
└─ docs/archive/_legacy/
   └─ ... (archivierte Alt-Tools, nicht produktiv)
```

## Installation (für Nutzer)

- **Android:** Browser-Menü → **„App installieren“**
- **iOS:** **Teilen** → **„Zum Home-Bildschirm“**

## Admin: Updates (idiotensicher)

### A) Stundenplan (Standard/Fallback JSON)
1. Datei ersetzen: `content/stundenplan.json`
2. Commit + Push nach GitHub
3. App neu laden (bei Bedarf Hard-Reload)

**Hinweis (PDF-Link):**
- Das PDF wird automatisch aus `content/stundenplan.json` gelesen (`meta.source`).
- Das PDF muss unter `content/timetables/<meta.source>` liegen.



### B) Kalender (TXT-Quellen)
1. Dateien in `content/txt/calendars/` pflegen (`schule.txt`, `klasse-hgt2.txt`, `ferien.txt`)
2. Commit + Push
3. Neu laden

### C) PDF-Stundenplan austauschen
1. Neue PDF nach `content/timetables/` hochladen
2. In `content/stundenplan.json` in `meta.source` den Dateinamen setzen (oder beibehalten, wenn du denselben Dateinamen nutzt)
3. Commit + Push

### D) TV-Daten
- `assets/data/runtime/bell-times.json`
- `assets/data/runtime/announcements.json`

## Hinweis zu Legacy-Dateien

Nicht mehr aktive Parser-, Test- und Build-Hilfen liegen unter `docs/archive/_legacy/` und werden von der Laufzeit nicht benötigt.

## Refactor Notes

- Pfade/URLs werden zentral über `src/config/paths.js` verwaltet.
- Änderungen sollen behavior-preserving sein (keine sichtbaren UI/Feature-Änderungen, außer Bugfix + Doku).



## Admin-Dokumentation

- Detaillierte Datei-für-Datei-Anleitung: `docs/ADMIN_DATEIEN_GUIDE.md`


## Bilder lokal austauschen (ohne externe Verlinkung)
- Icons liegen lokal in `assets/icons/` und können direkt ersetzt werden.
- Standardnamen für PWA-Icons: `icon-192.svg`, `icon-512.svg`, `icon-512-maskable.svg`.
- Für Änderungen nur Datei überschreiben (gleicher Name), dann Commit + Push.


## Neue Content-Regeln
- Nicht-Programmierbare Inhalte liegen unter `content/`.
- Pflichtdateien und Dateinamen stehen in `docs/UPDATE_GUIDE.md`.
- Legacy liegt archiviert unter `docs/archive/_legacy/`.
