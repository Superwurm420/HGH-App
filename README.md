# HGH – Schüler-PWA

Schul-App für Schüler mit dem Ziel: **Inhalte in Minuten aktualisieren – ohne Codewissen**.

## Schnellstart

```bash
python3 -m http.server 8080
# dann: http://127.0.0.1:8080
```

## Für Schuladmins (wichtigster Einstieg)

- **5-Minuten-Anleitung:** `docs/ADMIN_5_MINUTEN.md`
- **Produktbild (Soll-Zustand):** `docs/PRODUKTBILD.md`
- **Betriebsleitfaden:** `docs/OPERATIONS.md`

## Häufig bearbeitete Pfade

- Stundenplan (Admin): `content/timetables/` (PDF ersetzen)
- Kalender: `content/txt/calendars/files.txt`
- Ankündigungen: `content/txt/events/files.txt`, `content/txt/events/*.txt`
- Icons/Logos: `assets/icons/`
- Bilder: `assets/images/`

## Für Maintainer

- Onboarding: `docs/ONBOARDING.md`
- Troubleshooting: `docs/TROUBLESHOOTING.md`
- Datenformate/Contracts: `docs/contracts/`

## Qualitätschecks

```bash
node --check src/app.js
node --check src/parsers/pdf/pdf-timetable-v2.js
node tests/pdf-parser-v2.test.mjs
node tests/timetable-source.test.mjs
```
