# Projekt-Audit (Stand: 2026-02-26)

## Scope
- Vollständige statische Review der Projektstruktur, UI/UX-Konsistenz, Codequalität, Performance- und Sicherheits-/Logik-Aspekte.
- Zusätzlich technische Basischecks (`lint`, `build`, Content-Validatoren) ausgeführt.

## A) Kritische Probleme (sofort fixen)
1. **Doppelte Parsing-/Dateiname-Logik an mehreren Stellen**
   - Das Namensschema + Fallback-Erkennung für Stundenpläne liegt parallel in `src/lib/timetable/selectLatest.ts`, `scripts/select-latest-timetable.mjs` und `scripts/validate-content.mjs`.
   - Risiko: Drift zwischen Laufzeit- und Build-/CLI-Verhalten bei späteren Änderungen.
2. **Unsaubere Typgrenzen bei Generated JSON (Doppelt-Cast via `unknown`)**
   - In `src/lib/timetable/server.ts` und `src/lib/announcements/server.ts` wird ohne Runtime-Validierung auf konkrete Typen gecastet.
   - Risiko: Bei fehlerhaften Generated-Dateien entstehen schwer nachvollziehbare Laufzeitfehler.
3. **Hohe operative Komplexität in `scripts/prebuild.mjs` (761 Zeilen, mehrere Verantwortlichkeiten)**
   - Ein einzelnes Script übernimmt PDF-Parsing, Announcement-Parsing, Kalender-/Message-Handling und Service-Worker-Generierung.
   - Risiko: Hohe Kopplung, schwieriges Testen, erhöhte Fehleranfälligkeit bei Änderungen.

## B) Verbesserungen mit hohem Mehrwert
1. **Unbenutzte/legacy Komponenten im `src/components`-Baum entfernen oder klar kennzeichnen**
   - `AppHeader`, `StatusHint`, `OfflineCacheSync`, `ScheduleView`, `Clock` sind aktuell nicht in Seiten eingebunden.
   - Mehrwert: Weniger kognitive Last, klarere Architekturgrenzen.
2. **UI-Token-Bypass per Inline-Styles reduzieren**
   - Mehrere Komponenten setzen Layoutwerte direkt als Inline-Styles (`width`, `paddingRight`, iframe-Styles etc.).
   - Mehrwert: Einheitlicheres Styling, bessere Wartbarkeit.
3. **Inkonsistente Produktlogik in Doku vs. App-Navigation korrigieren**
   - README beschreibt `/einstellungen` als Klassen-Seite; tatsächlich redirect auf `/weiteres`.
   - Mehrwert: Weniger Verwirrung für Redakteure/Stakeholder.

## C) Mittelfristige Optimierungen
1. **Clientseitige Zeit-/Datumslogik zentralisieren**
   - `Countdown`, `DailyMessage`, `Clock`, `ExpiryCountdown` nutzen eigene Intervall-/Zeitlogiken.
   - Ziel: Einheitliche Utilities/Hooks (`useBerlinTime`, `useTicker`) für bessere Konsistenz.
2. **`useEffect`-Muster für URL-/Storage-Sync vereinheitlichen**
   - `ClassFromStorage` + `ClassSelector` triggern beide URL-abhängige Updates.
   - Ziel: Doppelnavigationen vermeiden, Renderpfad vereinfachen.
3. **Fehlerbehandlung und Monitoring sichtbarer machen**
   - Service-Worker-Registering schluckt Fehler still (`catch(() => {})`).
   - Ziel: mind. Debug-Logging im Dev-Modus.

## D) Rein kosmetische Themen
1. **Komponentenstile teilweise gemischt (Tailwind + globale Klassen + Inline-Styles)**
2. **Text-/Label-Uneinheitlichkeiten** (z. B. „Home“ in Navigation vs. restlich deutsche UI)
3. **Kleinere Semantik-Konsistenz** (z. B. teilweise `h2`-Gewichte/Abstände leicht unterschiedlich)

## E) Priorisierte TODO-Liste

### High
- [ ] Parse-/Fallback-Logik für Stundenplan-Dateien in ein gemeinsames Modul konsolidieren (Build + Runtime + Validator).
- [ ] Runtime-Validierung für `src/generated/*.json` ergänzen (z. B. simple Guards), danach erst Type-Cast.
- [ ] `scripts/prebuild.mjs` in kleinere, testbare Module trennen (PDF, Announcements, Kalender, SW).

### Medium
- [ ] Unbenutzte Komponenten entfernen oder in `legacy/` verschieben + dokumentieren.
- [ ] Storage-/URL-Sync für Klassenauswahl auf einen robusten Ablauf reduzieren.
- [ ] Zeitlogik über gemeinsame Hook/Utility abstrahieren.

### Low
- [ ] Inline-Styles in Utility-/Token-Klassen überführen.
- [ ] README-Navigationsbeschreibung mit realem Routing abgleichen.
- [ ] Kleine Text-/Label-Politur für sprachliche Einheitlichkeit.

## F) Gesamtbewertung
- **Technischer Zustand:** solide Basis, Build und Lint sind grün; zentrale Kernfunktion (prebuild-basiertes Content-Modell) funktioniert.
- **Hauptrisiko:** Wartbarkeit durch gestiegene Komplexität (insb. Prebuild + duplizierte Logik + ungenutzte Altkomponenten).
- **UI/UX-Reifegrad:** gut nutzbar, aber mit erkennbaren Konsistenzlücken im Detail.
- **Empfehlung:** kurzfristig auf Konsolidierung und Entkopplung fokussieren, danach gezielte UX-Harmonisierung.
