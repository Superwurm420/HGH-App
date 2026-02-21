# Troubleshooting

## 1) Kalender werden nicht angezeigt

### Symptome
- Kalenderkarte ist leer oder zeigt keine Events.

### Checks
1. `content/txt/calendars/files.txt` vorhanden?
2. Format korrekt? (`Name|URL`)
3. URL liefert wirklich ICS (`BEGIN:VCALENDAR`)?
4. Enthält der Kalender Termine im sichtbaren Zeitraum?

### Schnelltest
- Eintrag testweise auf einen bekannten Google-ICS-Link setzen.
- Seite hart neu laden.

### Typische Ursachen
- Falsches Trennzeichen (kein `|`)
- Embed-Link ohne `src`
- Externer Anbieter blockt Zugriff

### Fix
- URL korrigieren, Commit + Push.
- Bei Ausfall eines Kalenders vorübergehend entfernen/auskommentieren.

---

## 2) PDF-Stundenplan-Link geht nicht

### Checks
1. `content/stundenplan.json` → `meta.source` gesetzt?
2. Datei mit diesem Namen liegt in `content/timetables/`?
3. Schreibweise exakt gleich (Groß/Kleinschreibung)?

### Fix
- Dateiname in `meta.source` oder PDF-Datei korrigieren.

---

## 3) Ankündigungen fehlen

### Checks
1. Datei in `content/txt/events/files.txt` eingetragen?
2. Datei enthält gültige Felder (`titel`, `sichtbar`, optional `start`/`ende`)?
3. Termin bereits abgelaufen?

### Fix
- Datei in `files.txt` eintragen.
- `sichtbar: ja` setzen.
- Datumsbereich prüfen.

---

## 4) Sondertermine werden falsch erkannt

### Checks
1. Tokenformat im PDF-Rohtext: `class:...;day:...;slot:...;subject:...`
2. `day` nutzt erlaubte Muster (`mo`, `mo-fr`, `mo,mi`, `woche`)
3. `slot` nutzt Zahlen/Bereiche/Listen (`1`, `1-9`, `1,3-4`)

### Fix
- Token in `content/stundenplan.pdf.raw.json` bzw. Importquelle korrigieren.

---

## 5) CI schlägt fehl

### Checks lokal
```bash
node --check src/app.js
node --check src/parsers/pdf/pdf-timetable-v2.js
node tests/pdf-parser-v2.test.mjs
node tests/timetable-source.test.mjs
```

### Fix
- Fehlermeldung im betroffenen Pfad korrigieren.
- Commit erneut pushen.
