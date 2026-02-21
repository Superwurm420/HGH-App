# HGH – Schüler-PWA

Minimal gehaltene Schul-PWA (Vanilla HTML/CSS/JS) für GitHub Pages.

## Schnellstart

```bash
python3 -m http.server 8080
# dann: http://127.0.0.1:8080
```

## Für Betrieb & Übergabe (wichtig)

- **Single Source of Truth:** `docs/OPERATIONS.md`
- **Onboarding für neue Maintainer:** `docs/ONBOARDING.md`
- **Fehlerbehebung:** `docs/TROUBLESHOOTING.md`
- **Datenformate/Contracts:** `docs/contracts/`

## Häufige Pflege-Dateien

- Stundenplan: `content/stundenplan.json`
- Stundenplan-PDF: `content/timetables/`
- Kalenderquellen: `content/txt/calendars/files.txt`
- Ankündigungen: `content/txt/events/files.txt` + `content/txt/events/*.txt`

## Qualitätschecks

```bash
node --check src/app.js
node --check src/parsers/pdf/pdf-timetable-v2.js
node tests/pdf-parser-v2.test.mjs
node tests/timetable-source.test.mjs
```
