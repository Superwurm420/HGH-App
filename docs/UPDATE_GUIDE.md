# UPDATE GUIDE

## Grundregel
- Code nur in `/src/`
- Inhalt nur in `/content/`

## Pflicht-Dateinamen (einfach austauschbar)

### Kalender-TXT
- `content/txt/calendars/schule.txt`
- `content/txt/calendars/klasse-hgt2.txt`
- `content/txt/calendars/ferien.txt`

Inhalt: pro Datei entweder
- nur URL (`https://...ics`) oder
- `Label|https://...ics`

### Termine-TXT
- `content/txt/events/files.txt` (Liste aktiver Event-Dateien)
- `content/txt/events/klausuren.txt`
- `content/txt/events/projekte.txt`
- `content/txt/events/veranstaltungen.txt`

### Stundenplan
- `content/timetables/current.pdf` (aktueller Plan)
- Archiv optional in `content/timetables/archive/`

### Bilder
- Slideshow: `content/images/slideshow/`
- UI-Bilder: `content/images/ui/`
- PWA-Icons: `assets/icons/icon-192.svg`, `assets/icons/icon-512.svg`, `assets/icons/icon-512-maskable.svg`

## Formate
- Kalender/Termine: TXT
- Stundenplan: PDF
- Bilder: JPG/PNG/WEBP/SVG (Dateiname beibehalten => kein Code ändern)
