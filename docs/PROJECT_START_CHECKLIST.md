# Projektstart-Checkliste (Code-Stand-Abgleich)

> Stand: Abgleich gegen `scripts/`, `src/lib/`, `src/app/`.

## A) Muss vor Implementierung klar sein
- [x] Klassenliste final
- [x] Dateimuster für Stundenplan-PDF final
- [x] Datumsformat für Pinnwand final (`TT.MM.JJJJ HH:mm`)
- [x] Zeitzone festgelegt (`Europe/Berlin`)
- [x] Sondertermine überschreiben Regelunterricht
- [x] Original-PDF-Button als Pflichtfunktion

## B) Technische Leitplanken (gegen Code geprüft)

### 1) Parser für Dateinamen implementiert
- [x] **Erledigt**
- **Nachweis im Code:**
  - `parseTimetableFilename()` inkl. Namensschema + Fallback-Strategien (`name-pattern`, `name-fallback`, `file-mtime`).
  - `compareTimetable()` für eindeutige Auswahl der neuesten Datei.
  - CLI-Check über `scripts/select-latest-timetable.mjs`.
- **Module/Funktionen:**
  - `src/lib/timetable/selection-core.ts` → `parseTimetableFilename`, `compareTimetable`, `selectLatestTimetable`
  - `scripts/lib/timetable-selection.mjs` → Brücke auf die Core-Logik
  - `scripts/select-latest-timetable.mjs` → operative Auswahl/Prüfung

### 2) Parser/Validator für Pinnwand-TXT implementiert
- [x] **Erledigt**
- **Nachweis im Code:**
  - Header-/Body-Parser inkl. Pflichtfeldwarnungen (`title`, `date`) und Sichtbarkeitslogik.
  - Datumsparser für Berlin-Zeit (`parseBerlinDate`) sowie Aktivitätsprüfung (`isActive`).
  - Inhaltsvalidierung per Script (`validate-content.mjs`) inkl. Formatprüfung für `date`/`expires`.
- **Module/Funktionen:**
  - `src/lib/announcements/parser.ts` → `parseAnnouncement`, `parseBerlinDate`, `isActive`, `isVisibleForClass`
  - `src/lib/announcements/server.ts` → Filterung und Bereitstellung
  - `scripts/validate-content.mjs` → `validateAnnouncements`

### 3) Erststart-Klassenauswahl umgesetzt
- [x] **Erledigt (Basisfluss vorhanden)**
- **Nachweis im Code:**
  - Stundenplan-API liefert `availableClasses` und fallbackt auf erste verfügbare Klasse.
  - Start-/Stundenplan-/Pinnwand-Seiten binden Klassenauswahl und gespeicherte Klasse ein.
  - Lokale Persistenz für Klassenauswahl vorhanden.
- **Module/Funktionen:**
  - `src/lib/timetable/server.ts` → `getWeeklyPlanForClass`
  - `src/app/page.tsx`, `src/app/stundenplan/page.tsx`, `src/app/pinnwand/page.tsx`
  - `src/lib/storage/preferences.ts` → `saveSelectedClass`, `loadSelectedClass`

### 4) Fehlerzustände (teilweise lesbar / unlesbar) visualisiert
- [ ] **Offen (nur generische Fehleranzeige vorhanden)**
- **Ist-Zustand:**
  - Globales Error-UI vorhanden, aber keine differenzierte Visualisierung für „teilweise lesbar“ vs. „unlesbar“ pro Datenquelle.
- **Akzeptanzkriterien (ergänzt):**
  - [ ] Parser-/Validierungsfehler werden pro Quelle und Schweregrad als UI-Hinweis dargestellt (z. B. Stundenplan teilweise unvollständig).
  - [ ] Bei vollständigem Ausfall wird klar zwischen „keine Daten“ und „fehlerhafte Daten“ unterschieden.
  - [ ] Hinweise enthalten konkrete Handlungsoption (z. B. „Original-PDF öffnen“, „Dateiablage prüfen“).
- **Module/Funktionen (relevant):**
  - `src/app/error.tsx`
  - `src/lib/timetable/server.ts` (Rückgabe `null` bei fehlenden/inkonsistenten Daten)
  - `scripts/validate-content.mjs` (Fehler-/Warnquellen)

### 5) Offline-Fallback für letzte gültige Daten umgesetzt
- [ ] **Offen (Bausteine vorhanden, Integration fehlt)**
- **Ist-Zustand:**
  - `saveLastData`/`loadLastData` existieren, werden aktuell aber nicht im App-Flow genutzt.
- **Akzeptanzkriterien (ergänzt):**
  - [ ] Bei API-/Netzfehlern wird letzter gültiger Stand aus lokalem Cache geladen.
  - [ ] UI kennzeichnet „Offline-/Cache-Stand“ inkl. Zeitstempel.
  - [ ] Cache-Invalidierung über Versionskennung (z. B. analog `bootstrap version`/ETag).
- **Module/Funktionen (relevant):**
  - `src/lib/storage/preferences.ts` → `saveLastData`, `loadLastData`
  - `src/app/api/bootstrap/route.ts` → Versions-/ETag-Bereitstellung

## C) Qualitätskriterien je Feature

### 1) Funktion auf Mobilansicht getestet
- [ ] **Offen**
- **Akzeptanzkriterien (ergänzt):**
  - [ ] Smoke-Test für Home, Stundenplan, Pinnwand in mobilen Breakpoints dokumentiert.
  - [ ] Keine horizontalen Overflows in Kern-Views (Home-Dashboard, Tabellen, Karten).
- **Relevante Module:**
  - `src/app/page.tsx`, `src/app/stundenplan/page.tsx`, `src/app/pinnwand/page.tsx`

### 2) Darkmode getestet
- [ ] **Offen**
- **Akzeptanzkriterien (ergänzt):**
  - [ ] Alle Kernseiten in `light` und `dark` visuell geprüft.
  - [ ] Kontrastkritische Elemente (Buttons, Meta-Texte, Fehlerhinweise) erfüllen Lesbarkeit.
- **Relevante Module:**
  - `src/lib/storage/preferences.ts` → `saveTheme`, `loadTheme`
  - `src/app/layout.tsx` (globale Theme-Anwendung)

### 3) Fehlermeldungen verständlich (Deutsch)
- [ ] **Offen (teilweise bereits erfüllt)**
- **Ist-Zustand:**
  - Viele Nutzertexte sind bereits deutsch, jedoch keine konsolidierte Qualitätsprüfung über alle Fehlerpfade.
- **Akzeptanzkriterien (ergänzt):**
  - [ ] Alle API-Fehlerantworten nutzen konsistente, verständliche deutsche Meldungen.
  - [ ] Frontend zeigt technische Fehler abstrahiert und handlungsorientiert an.
- **Relevante Module:**
  - `src/app/error.tsx`
  - `src/app/api/admin/login/route.ts`
  - `src/app/api/admin/announcements/route.ts`

### 4) Doku aktualisiert
- [ ] **Offen**
- **Akzeptanzkriterien (ergänzt):**
  - [ ] Architektur-/Betriebsdoku für Dateiablage + Validierung + Admin-Flow ist auf aktuellem Stand.
  - [ ] Checklisten-/Runbook-Links auf konkrete Skripte und Einstiegspunkte vorhanden.
- **Relevante Module/Skripte:**
  - `scripts/prebuild.mjs`, `scripts/validate-content.mjs`, `scripts/select-latest-timetable.mjs`
  - `src/lib/timetable/server.ts`, `src/lib/announcements/repository.ts`

## D) Definition of Done (MVP)
- [ ] Klassenauswahl, Stundenplananzeige, Sondertermine, Original-PDF-Button laufen stabil
- [ ] Inhaltspflege ist über Dateiablage dokumentiert und reproduzierbar
- [ ] Projekt ist für Erweiterungen (Kalender/Pinnwand/Push) strukturell vorbereitet

### Konkretisierung DoD (Akzeptanzkriterien)
- [ ] Stabilitäts-Check über mindestens einen vollständigen Datenzyklus (Import/Prebuild/Anzeige) ohne manuelle Korrektur.
- [ ] Validierung (`scripts/validate-content.mjs`) ist vor Deployment fester Schritt.
- [ ] Fehler-/Fallback-Verhalten ist für Null-Daten, Teilfehler und Offline dokumentiert und getestet.

---

## Nächste 2–3 Sprints (priorisiert)

### Sprint 1 — Security & Betriebsstabilität (höchste Priorität)
1. **Admin-Auth härten**
   - Passwort aus Environment statt Hardcode.
   - Session-Token mit Ablauf + Secret-Rotation (HMAC/JWT-ähnlich) statt statischem Ableitungswert.
   - Rate-Limit für Login-Endpunkt.
   - **Referenzen:** `src/lib/admin/auth.ts`, `src/app/api/admin/login/route.ts`, `src/app/api/admin/session/route.ts`
2. **API-Zugriffsschutz vereinheitlichen**
   - Prüfen, dass alle Admin-Mutationen konsistent Session validieren.
   - **Referenz:** `src/app/api/admin/announcements/route.ts`
3. **Monitoring-Grundlage**
   - Strukturierte Logs für Prebuild-/Parser-Fehler und Admin-Schreibvorgänge.
   - **Referenzen:** `src/lib/timetable/server.ts`, `scripts/prebuild.mjs`, `src/lib/announcements/repository.ts`

### Sprint 2 — Persistenz & Fallback
1. **Offline-Cache aktiv integrieren**
   - Bootstrap-Daten im Client cachen, bei Fehlern auf letzten Stand zurückfallen.
   - Sichtbarer „Stand vom …“-Hinweis.
   - **Referenzen:** `src/lib/storage/preferences.ts`, `src/app/api/bootstrap/route.ts`
2. **Store-Robustheit erhöhen**
   - Optional: atomische Writes/Backup-Strategie für `announcements-store.json`.
   - Migrationspfad dokumentieren/automatisieren.
   - **Referenzen:** `src/lib/announcements/repository.ts`, `scripts/migrate-announcements-to-store.mjs`
3. **Validierung in CI/Release-Pipeline**
   - `scripts/validate-content.mjs` als verpflichtender Schritt.
   - **Referenz:** `scripts/validate-content.mjs`

### Sprint 3 — UX & Tests
1. **Gezielte Fehlerzustands-UX**
   - Unterschiedliche UI für „keine Daten“, „teilweise Daten“, „Daten fehlerhaft“.
   - **Referenzen:** `src/app/error.tsx`, `src/app/page.tsx`, `src/app/stundenplan/page.tsx`
2. **Testabdeckung erhöhen**
   - Unit-Tests für Datums-/Dateinamensparser und Klassenfilterlogik.
   - E2E-Smoke für Kernnavigation + Klassenwechsel.
   - **Referenzen:** `src/lib/timetable/selection-core.ts`, `src/lib/announcements/parser.ts`, `src/lib/timetable/server.ts`
3. **Mobile/Darkmode-Abnahme**
   - Definierte Prüfliste inkl. Screenshot-Nachweise für Kernseiten.
   - **Referenzen:** `src/app/page.tsx`, `src/app/pinnwand/page.tsx`, `src/app/stundenplan/page.tsx`, `src/app/layout.tsx`
