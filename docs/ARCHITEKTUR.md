# Architektur-Grundlage

## Kernidee
- Neueste Stundenplan-PDF wird primär anhand des Dateinamens gewählt (mit Fallback-Erkennung bei abweichenden Namen).
- PDF wird zur **Build-Zeit** ausgelesen (Text + Positionsdaten) und in eine Klassen-Wochenstruktur überführt.
- Verfügbare Klassen werden **dynamisch aus dem PDF-Header** erkannt (nicht im Code festgelegt).
- Spaltenbreiten werden automatisch aus den Abständen der erkannten Klassen berechnet.
- Startseite zeigt den **heutigen** Unterricht der gewählten Klasse, Wochenansicht zeigt alle Wochentage.

## Wie die PDF-Erkennung funktioniert

### 1. Dateiname → Auswahl der neuesten PDF
```
Stundenplan_kw_09_Hj2_2025_26.pdf   ← bevorzugtes Schema
Plan_2025_KW10.pdf                   ← Fallback (Jahreszahl reicht)
```
Sortierung: Jahr → Halbjahr → Kalenderwoche (absteigend). Die erste ist „die neueste".

### 2. PDF → Geparste Daten (Build-Zeit)
Das Prebuild-Script (`scripts/prebuild.mjs`) läuft vor jedem `next build`:
1. Scannt `public/content/timetables/` nach `.pdf`-Dateien
2. Erkennt Klassen-Spalten automatisch aus dem PDF-Header (sucht nach Tokens wie HT11, G21, GT01)
3. Berechnet Spaltenbreiten dynamisch (Mitte zwischen benachbarten Klassen)
4. Liest Wochentage (MO–FR), Stundennummern und Zeitangaben
5. Ordnet Fächer den erkannten Spalten zu
6. Schreibt Ergebnis nach `src/generated/timetable-data.json`

### 3. Wann wird neu geparst?
- **Vercel**: Automatisch bei jedem Git-Push (Vercel baut neu → `prebuild.mjs` läuft)
- **Lokal**: Bei `npm run dev` oder `npm run build`
- **Manuell**: `npm run prebuild`

### 4. Was wenn die PDF-Struktur anders ist?
Der Parser erkennt Klassen und Spalten **dynamisch**. Er hat keine fest einprogrammierten Klassen oder Pixel-Positionen. Solange die PDF:
- Klassennamen im oberen Bereich hat (z.B. HT11, G21)
- Wochentage (MO, DI, MI, DO, FR) links stehen
- Stunden nummeriert sind (1., 2., 3., ...)

...wird sie korrekt geparst. Die Diagnose im Build-Log zeigt genau, welche Klassen erkannt wurden und wie viele Stunden pro Klasse.

## Verzeichnisstruktur
```text
public/content/                     ← HIER DATEIEN AUSTAUSCHEN
  timetables/                       ← Stundenplan-PDFs ablegen
  announcements/                    ← Pinnwand-TXT ablegen
  branding/                         ← Logo etc.

scripts/
  prebuild.mjs                      ← Parst PDFs + TXTs → JSON (läuft vor Build)
  validate-content.mjs              ← Prüft Dateinamen + TXT-Format
  select-latest-timetable.mjs       ← Zeigt neueste PDF an
  parse-timetable-pdf.mjs           ← Parst einzelne PDF (Debugging)

src/
  data/
    timetable-data.json             ← Generiert durch prebuild (nicht manuell ändern)
    announcements-data.json         ← Generiert durch prebuild
  app/
    page.tsx                        ← Heute: Uhrzeit + heutiger Unterricht
    stundenplan/page.tsx            ← Wochenübersicht
    pinnwand/page.tsx               ← Ankündigungen
  lib/timetable/
    selectLatest.ts                 ← Auswahl neueste PDF + Fallback
    pdfParser.ts                    ← Tageszuordnung
    server.ts                       ← Daten-Zugriff für Seiten
    types.ts                        ← TypeScript-Typen
```

## Prioritäten
1. Sondertermine / Ankündigungen (werden im Tages-/Wochenplan priorisiert angezeigt)
2. Regulärer Unterricht aus PDF

## Offline / PWA
- Manifest + Service Worker vorhanden
- Zuletzt geladene Daten werden lokal gespeichert

## Hosting-Hinweis
- Für diese Architektur ist Vercel (Next.js Runtime) als Hosting-Standard vorgesehen.
- Bei jedem Git-Push baut Vercel automatisch neu und führt `prebuild.mjs` aus.
