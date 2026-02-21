# Operations Guide (Single Source of Truth)

Gültig ab: 2026-02-21

Diese Datei ist die zentrale Betriebsanleitung für das HGH-Projekt.
Wenn andere Doku-Dateien abweichen, gilt **diese** Datei.

## 1) Zielgruppe
- Admins (Inhalte pflegen)
- Maintainer (Code + Deploy)

## 2) Schnellablauf für Inhalts-Updates
1. Datei(en) im `content/` oder `assets/data/` anpassen.
2. Neue PDF nach `content/timetables/` hochladen (Dateiname: `Stundenplan_kw_<KW>_Hj<1|2>_<YYYY>_<YY>.pdf`).
3. GitHub Actions Workflow **Rebuild timetable on PDF upload** startet automatisch und erzeugt `content/stundenplan.generated.json` neu.
4. Optional lokal prüfen: `node scripts/build-timetable-from-pdf.mjs` und danach `node scripts/generate-sw-assets.mjs`.
5. Seite neu laden (ggf. Hard-Reload wegen Service Worker).

---

## 3) Stundenplan

### 3.1 Primäre Datenquelle
- Ausschließlich `content/stundenplan.generated.json`.
- Diese Datei wird bei jedem PDF-Update neu erzeugt.

### 3.2 PDF-Link
- Dateiname liegt in `content/stundenplan.generated.json` unter `meta.source`.
- Datei liegt in `content/timetables/`.

### 3.3 Sondertermine
Der Parser unterstützt:
- Slot-Bereiche: `1-9`
- Slot-Listen: `1,3-4,8`
- Tag-Bereiche: `mo-fr`
- Mehrtage-Liste: `mo,mi,fr`
- Ganze Woche: `woche`

Referenz: `docs/contracts/stundenplan-json.md`

---

## 4) Kalender

### 4.1 Primärdatei
- `content/txt/calendars/files.txt`
- Format pro Zeile: `Name|ICS-URL`
- Kommentare mit `#`, leere Zeilen erlaubt.

### 4.2 Fallback
Wenn `files.txt` fehlt/leer ist, werden weiterhin gelesen:
- `content/txt/calendars/schule.txt`
- `content/txt/calendars/klasse-hgt2.txt`
- `content/txt/calendars/ferien.txt`

### 4.3 Beispiel
```txt
Schulkalender|https://calendar.google.com/calendar/ical/abc%40group.calendar.google.com/public/basic.ics
```

Referenz: `docs/contracts/calendar-files.md`

---

## 5) Ankündigungen

- Verzeichnis: `content/txt/events/`
- Aktiv-Liste: `content/txt/events/files.txt`
- In `files.txt` nur Dateinamen eintragen (eine Zeile je Datei).

Referenz: `docs/contracts/events-txt.md`

---

## 6) Runtime-Daten (TV)
- `assets/data/runtime/announcements.json`
- `assets/data/runtime/bell-times.json`

---

## 7) Qualitäts-Gate vor Merge
Die CI muss grün sein. Pflichtchecks:
- `node --check src/app.js`
- `node --check src/parsers/pdf/pdf-timetable-v2.js`
- `node tests/pdf-parser-v2.test.mjs`
- `node tests/timetable-source.test.mjs`

---

## 8) Rollen & Verantwortungen
- **Admin-Team:** Inhaltspflege gemäß Contracts
- **Maintainer-Team:** Code, Tests, CI, Deploy
- **Übergabe:** immer mit `docs/ONBOARDING.md` + `docs/TROUBLESHOOTING.md`
