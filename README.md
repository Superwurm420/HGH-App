# HGH-App – Stundenplan als installierbare PWA

Die App liest automatisch die neueste Stundenplan-PDF ein, erkennt verfügbare Klassen aus der PDF-Struktur und zeigt auf der Startseite die aktuelle Uhrzeit (Europe/Berlin), Sondertermine und den Unterricht vom heutigen Tag.

## Seiten
- **Heute (`/`)**: Uhrzeit, Klassenauswahl, heutiger Unterricht, Sondertermine
- **Wochenplan (`/stundenplan`)**: komplette Wochenansicht der Klasse + Button „Original-PDF anzeigen“
- **Pinnwand (`/pinnwand`)**: TXT-basierte Meldungen inkl. Warnungen bei Teilfehlern
- **Einstellungen (`/einstellungen`)**: Klasse ändern

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
npm run validate-content
npm run select-latest-timetable
```

## Kostenlos veröffentlichen (empfohlen: Vercel)
Vercel ist für Next.js am einfachsten und kostenlos nutzbar (Hobby-Plan).

1. Repo auf GitHub pushen.
2. Auf [vercel.com](https://vercel.com) mit GitHub anmelden.
3. **New Project** → Repo `HGH-App` auswählen.
4. Framework erkennt Vercel automatisch als **Next.js**.
5. **Deploy** klicken.
6. Nach dem Deploy die URL öffnen (z. B. `https://hgh-app.vercel.app`).
7. Auf dem Handy im Browser „Zum Home-Bildschirm“ / „Installieren“ wählen.

Hinweis: GitHub Pages ist nur für statische Seiten gedacht. Diese App nutzt serverseitige Next.js-Funktionen und läuft deshalb auf Vercel deutlich zuverlässiger.

## Inhalte
```text
public/content/
  timetables/      # Stundenplan-PDFs (Schema bevorzugt: Stundenplan_kw_XX_HjY_YYYY_YY.pdf)
  announcements/   # TXT für Pinnwand/Sondertermine
  branding/
```

## Fachlogik kurz
- Sondertermine werden im Tages-/Wochenplan priorisiert angezeigt.
- Klassenliste ist nicht fest im Code verdrahtet, sondern wird aus der aktuell geparsten PDF abgeleitet.
- Falls PDF-Namen vom Standardschema abweichen, nutzt die Auswahl der neuesten Datei eine robuste Fallback-Erkennung.
