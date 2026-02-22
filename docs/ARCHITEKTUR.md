# Architektur-Grundlage

## Kernidee
- Neueste Stundenplan-PDF wird primär anhand des Dateinamens gewählt (mit Fallback-Erkennung bei abweichenden Namen).
- PDF wird serverseitig ausgelesen (Text + Positionsdaten) und in eine Klassen-Wochenstruktur überführt.
- Verfügbare Klassen werden aus der geparsten PDF abgeleitet (nicht starr im Frontend hinterlegt).
- Startseite zeigt den **heutigen** Unterricht der gewählten Klasse, Wochenansicht zeigt alle Wochentage.

## Verzeichnisstruktur
```text
src/
  app/
    page.tsx                 # Heute: Uhrzeit + heutiger Unterricht
    stundenplan/page.tsx     # Wochenübersicht
  lib/timetable/
    selectLatest.ts          # Auswahl neueste PDF + Fallback
    pdfParser.ts             # Tageszuordnung
    server.ts                # Parser-Aufruf + Klassenableitung + Cache
```

## Prioritäten
1. Sondertermine / Ankündigungen (werden im Tages-/Wochenplan priorisiert angezeigt)
2. Regulärer Unterricht aus PDF

## Offline / PWA
- Manifest + Service Worker vorhanden
- Zuletzt geladene Daten werden lokal gespeichert

## Hosting-Hinweis
- Für diese Architektur ist Vercel (Next.js Runtime) als Hosting-Standard vorgesehen.
