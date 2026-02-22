# HGH-App – Stundenplan als installierbare PWA

Die App liest automatisch die neueste Stundenplan-PDF ein, zeigt auf der Startseite die aktuelle Uhrzeit (Europe/Berlin), Ankündigungen und den Unterricht vom heutigen Tag für die ausgewählte Klasse.

## Seiten
- **Heute (`/`)**: Uhrzeit, Klassenauswahl, heutiger Unterricht, Sondertermine
- **Wochenplan (`/stundenplan`)**: komplette Wochenansicht der Klasse + Button „Original-PDF anzeigen“
- **Pinnwand (`/pinnwand`)**: TXT-basierte Meldungen inkl. Warnungen bei Teilfehlern
- **Einstellungen (`/einstellungen`)**: Klasse ändern

## Start
```bash
npm install
npm run dev
```

## Build
```bash
npm run build
npm run start
```

## Content-Checks
```bash
npm run validate-content
npm run select-latest-timetable
```

## Inhalte
```text
public/content/
  timetables/      # Stundenplan-PDFs (Dateimuster: Stundenplan_kw_XX_HjY_YYYY_YY.pdf)
  announcements/   # TXT für Pinnwand/Sondertermine
  branding/
```
