# Architektur-Grundlage

## Kernidee
- Neueste Stundenplan-PDF wird anhand des Dateinamens automatisch gewählt.
- PDF wird serverseitig ausgelesen (Text + Positionsdaten) und in eine Klassen-Wochenstruktur überführt.
- Startseite zeigt den **heutigen** Unterricht der gewählten Klasse, Wochenansicht zeigt alle Wochentage.

## Verzeichnisstruktur
```text
src/
  app/
    page.tsx                 # Heute: Uhrzeit + heutiger Unterricht
    stundenplan/page.tsx     # Wochenübersicht
  lib/timetable/
    selectLatest.ts
    pdfParser.ts             # automatisches PDF-Einlesen
    server.ts
```

## Prioritäten
1. Sondertermine / Ankündigungen
2. Regulärer Unterricht aus PDF

## Offline / PWA
- Manifest + Service Worker vorhanden
- Zuletzt geladene Daten werden lokal gespeichert
