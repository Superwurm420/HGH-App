# Onboarding (30 Minuten)

## 0) Ziel
Du sollst nach 30 Minuten sicher:
- Inhalte pflegen,
- Fehler eingrenzen,
- Änderungen mit CI validieren.

## 1) Projekt starten (5 Min)
```bash
python3 -m http.server 8080
# dann http://127.0.0.1:8080
```

## 2) Wichtigste Dateien (10 Min)
- Betrieb: `docs/OPERATIONS.md`
- Fehlerbehebung: `docs/TROUBLESHOOTING.md`
- Stundenplan (Runtime): `content/stundenplan.generated.json`
- PDF-Quelle: `content/timetables/*.pdf`
- Kalender: `content/txt/calendars/files.txt`
- Ankündigungen: `content/txt/events/files.txt` + `content/txt/events/*.txt`

## 3) Pflichtchecks vor Merge (5 Min)
```bash
node --check src/app.js
node --check src/parsers/pdf/pdf-timetable-v2.js
node tests/pdf-parser-v2.test.mjs
node tests/timetable-source.test.mjs
```

## 4) Release & Rollback (5 Min)
- Release: Merge in `main` → GitHub Pages Deploy.
- Rollback: letzten funktionierenden Commit auf `main` wiederherstellen.

## 5) Do / Don't (5 Min)
### Do
- Nur dokumentierte Formate verwenden.
- Änderungen klein und nachvollziehbar halten.
- Bei Unklarheit zuerst Contracts prüfen (`docs/contracts/*`).

### Don't
- Legacy-Inhalte oder alte Stundenplan-Dateien wieder einführen.
- Ohne grünen CI-Status mergen.

## Übergabe-Checkliste
- [ ] Offene To-dos dokumentiert
- [ ] Bekannte Probleme dokumentiert
- [ ] Letzter stabiler Commit notiert
- [ ] Ansprechpartner/Vertretung benannt
