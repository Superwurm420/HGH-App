# PR Draft: generated-only timetable pipeline

## Summary
- Stundenplan läuft ausschließlich über `content/stundenplan.generated.json`.
- Neue PDF in `content/timetables/` wird über `scripts/build-timetable-from-pdf.mjs` verarbeitet.
- Keine Legacy-Fallback-Dateien mehr.

## Why
- Ein eindeutiges System vermeidet veraltete Datenquellen und versteckte Fallbacks.
- Jeder Upload folgt demselben Pipeline-Schritt und erzeugt dieselbe Runtime-Datei.

## Test checklist
- [ ] `content/stundenplan.generated.json` wird aus der neuesten PDF erzeugt.
- [ ] `meta.source` zeigt auf die neueste PDF-Datei.
- [ ] Timeslots 1–9 sind vorhanden.
- [ ] App zeigt bei fehlender generated-Datei den leeren Zustand statt Legacy-Fallback.
- [ ] App shell + dynamic content verhalten sich im Offline-Modus korrekt.
