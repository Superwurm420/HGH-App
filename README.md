# HGH-App – Stundenplan als installierbare PWA

Die App liest automatisch die neueste Stundenplan-PDF ein, erkennt verfügbare Klassen dynamisch aus der PDF-Struktur und zeigt auf der Startseite die aktuelle Uhrzeit (Europe/Berlin), Sondertermine und den Unterricht vom heutigen Tag.

## Seiten
- **Heute (`/`)**: Uhrzeit, Klassenauswahl, heutiger Unterricht, Sondertermine
- **Wochenplan (`/woche`)**: komplette Wochenansicht als scrollbare Tabelle (ca. 3 Tage sichtbar) + Hervorhebung des aktuellen Tages + Datum der letzten Kalender-Aktualisierung
- **Pinnwand (`/pinnwand`)**: TXT-basierte Meldungen inkl. Warnungen bei Teilfehlern
- **Einheitliche Terminpflege**: Ein gemeinsames TXT-Format für Pinnwand + hervorgehobene Sondertermine (`highlight`) inkl. klassengenauer Sichtbarkeit (`classes`)
- **Einstellungen (`/einstellungen`)**: Weiterleitung auf „Weiteres“ (`/weiteres`)

## Neuen Stundenplan hinzufügen
1. PDF in `public/content/timetables/` ablegen (Name: `Stundenplan_kw_XX_HjY_YYYY_YY.pdf`)
2. Commit + Push → Vercel baut automatisch neu
3. Klassen werden automatisch aus der PDF erkannt

Mehr Details: [docs/CONTENT_GUIDE.md](docs/CONTENT_GUIDE.md)

## Lokal starten
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
npm run validate-content         # Prüft Dateinamen + TXT-Format
npm run select-latest-timetable  # Zeigt welche PDF als neueste erkannt wird
npm run prebuild                 # Volles Parsen mit Diagnose-Ausgabe
```

## Kostenlos veröffentlichen (empfohlen: Vercel)
Vercel ist für Next.js am einfachsten und kostenlos nutzbar (Hobby-Plan).

1. Repo auf GitHub pushen.
2. Auf [vercel.com](https://vercel.com) mit GitHub anmelden.
3. **New Project** → Repo `HGH-App` auswählen.
4. Framework erkennt Vercel automatisch als **Next.js**.
5. **Deploy** klicken.
6. Nach dem Deploy die URL öffnen (z. B. `https://hgh-app.vercel.app`).
7. Auf dem Handy im Browser „Zum Home-Bildschirm" / „Installieren" wählen.

Hinweis: GitHub Pages ist nur für statische Seiten gedacht. Diese App nutzt serverseitige Next.js-Funktionen und läuft deshalb auf Vercel deutlich zuverlässiger.

## Inhalte
```text
public/content/
  timetables/      # Stundenplan-PDFs hier ablegen
  announcements/   # TXT für Pinnwand/Sondertermine
  schulferien-nds.json # Ferien/schulfreie Tage Niedersachsen (für Tagesmeldungen)
  branding/        # zentrale Logo-/Icon-Dateien für App & PWA
```

Alle wichtigen Bilddateien liegen damit an einem Ort: `public/content/branding/`.

## Fachlogik kurz
- **PDF-Erkennung**: Klassen und Spalten werden dynamisch aus dem PDF erkannt (nicht hardcodiert).
- **Fallback**: Auch PDFs mit abweichenden Namen werden erkannt, wenn eine Jahreszahl im Namen steht.
- **Neuester Plan robust**: Reihenfolge ist deterministisch über das echte Startdatum der ISO-Kalenderwoche (Montag). So wird ein bereits hochgeladener Plan für die kommende Woche sofort aktiv; `lastModified` und Dateiname bleiben Tie-Breaker.
- **Auto-Update ohne Handarbeit**: Client prüft regelmäßig per ETag auf neue Stundenplan-Version und aktualisiert die UI per `router.refresh()` ohne harten Full-Reload.
- **Sondertermine**: Kommen aus denselben TXT-Dateien wie Pinnwand-Beiträge und werden über `highlight: true` priorisiert angezeigt.
- **Sichtbarkeit je Klasse**: Beiträge können über `classes` gezielt auf Klassen begrenzt werden.
- **Diagnose**: Das Build-Log zeigt genau, welche Klassen erkannt wurden und wie viele Stunden geparst wurden.

## Weiterführende Docs
- [docs/ARCHITEKTUR.md](docs/ARCHITEKTUR.md) – Technische Architektur und PDF-Parsing im Detail
- [docs/CONTENT_GUIDE.md](docs/CONTENT_GUIDE.md) – Anleitung für Inhaltspflege ohne Programmierkenntnisse
- [docs/CONTENT_FORMATS.md](docs/CONTENT_FORMATS.md) – Dateiformate (PDF-Schema, TXT-Format)
