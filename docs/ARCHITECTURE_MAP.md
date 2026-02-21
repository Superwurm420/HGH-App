# Architecture Map (Ist-Analyse + Zielstruktur)

## 1) Entry-Points
- `index.html` lädt die komplette UI-Struktur (Views: Home, Stundenplan, Woche, Links, TV) und bindet `app.css` + ES-Module aus `src/app.js`.
- `src/app.js` ist der zentrale Runtime-Orchestrator (Routing, Rendering, State, Timer, Datenladen, Events).
- `service-worker.js` ist der Offline/Cache Entry-Point für Shell + dynamische Daten.
- Node-Entry-Points für Qualitätssicherung:
  - `tests/pdf-parser-v2.test.mjs`
  - `tests/timetable-source.test.mjs`

## 2) Datenfluss (PDF → Parsing → Datenmodell → Rendering)
1. Datenquelle wird über `loadTimetableSource()` geladen (`src/services/timetable/timetable-source-service.js`).
2. Service lädt parallel/seriell:
   - `content/stundenplan.pdf.raw.json` (PDF-Rohdaten),
   - `content/stundenplan.json` (manuelle JSON-Fallbackquelle).
3. PDF-Rohdaten werden über `importTimetableFromPdfRaw()` (`src/services/timetable/pdf-import-service.js`) und darunter `parsePdfTimetableV2()` in ein Normalmodell transformiert.
4. Zeitstempelvergleich entscheidet Source-of-Truth zur Laufzeit: neueres Modell gewinnt (PDF vs JSON).
5. Ergebnis wird im App-State durch `parseAndNormalizeTimetable()` (`src/modules/timetable-parser.js`) final normalisiert/validiert.
6. UI-Renderer in `src/app.js` erzeugen daraus:
   - Tagesvorschau,
   - Wochenmatrix,
   - Countdown/Nächste Stunde,
   - TV-Ansichten.

## 3) Sondertermine-Logik
- Sondertermine entstehen im PDF-Parser (`src/parsers/pdf/pdf-timetable-v2.js`):
  - Keyword-Heuristik (`SPECIAL_KEYWORDS`) und/ oder lange freie Texte ohne Lehrer/Raum.
  - Speicherung als `meta.specialEvents` im Modell.
- UI rendert Hinweise über `note`/Sonderevent-Informationen ohne Layoutwechsel.

## 4) Klassen-Logik
- Klassenliste ist zentral in `src/config/app-constants.js` definiert (`CLASSES`).
- Parser-Normalisierung:
  - erzeugt leere Klassenstrukturen,
  - validiert Slot-IDs,
  - löst `sameAs`-Referenzen auf,
  - dedupliziert kollidierende Einträge.
- Auswahl in Home/Woche basiert auf State `classIds`; Fallback auf `CLASSES`.

## 5) Asset-Handling
- Pfade/URLs liegen zentral in `src/config/paths.js` + konsumierende Mapping-Konstanten in `src/config/app-constants.js`.
- Inhaltsdaten für Nicht-Entwickler:
  - `content/stundenplan.json`,
  - `content/stundenplan.pdf.raw.json`,
  - `content/kalender.ics`,
  - `content/kalender-quellen.txt`,
  - `assets/tv-slides/slides.json`,
  - `assets/data/*` (Fun-Messages, Ankündigungen).

## 6) Service Worker / Caching
- App-Shell: cache-first (+ background revalidate).
- Dynamische Daten (Stundenplan/Ankündigungen/Kalender): network-first mit Cache-Fallback.
- Navigationsrequests: network-first, fallback auf gecachte `index.html`, sonst Offline-HTML.
- Versionierter Cache-Key (`hgh-school-pwa-vX.Y.Z`) für kontrollierte Invalidierung.

## 7) Identifizierte strukturelle Schwächen (vor Refactor)
1. `src/app.js` war stark monolithisch (State, Konfiguration, Renderlogik, Datenlogik in einer Datei).
2. Mehrfach definierte Domänenkonstanten (Klassen/Slots) erhöhten Drift-Risiko.
3. PDF-Importlogik war funktional bereits vorhanden, aber nicht explizit als Service-Schicht gekapselt.
4. Wartungsrelevante Inhalte waren teilweise zwar als Dateien vorhanden, aber nicht konsequent über zentrale Config adressiert.
5. Service-Worker-Assetliste ist statisch und muss bei Strukturänderungen manuell gepflegt werden.

## 8) Durchgeführte Zielstruktur (Refactor)
- `src/config/` → zentrale Konfiguration (`paths`, `app-constants`).
- `src/core/` → App-State-Factory (`createInitialState`).
- `src/services/timetable/` → gekapselte Datenservices:
  - `pdf-import-service.js`,
  - `timetable-source-service.js`.
- `src/modules/` → Normalisierung/Domainlogik.
- `src/parsers/` → Low-level Parser.
- `src/data/timetable-source.js` bleibt als Kompatibilitäts-Reexport bestehen.
