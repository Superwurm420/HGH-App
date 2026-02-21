CONTENT-BEREICH (nur redaktionelle Pflege)

Regel:
- Alles, was Schule später ändern darf, liegt in /content
- Codeänderungen sind dafür nicht nötig

Wichtige Pfade und Dateinamen:

1) Kalender (TXT)
- content/txt/calendars/schule.txt
- content/txt/calendars/klasse-hgt2.txt
- content/txt/calendars/ferien.txt
Format je Datei:
- entweder nur URL
- oder Label|URL

2) Termine / Ankündigungen (TXT)
- content/txt/events/files.txt   (Liste aktiver Dateien)
- content/txt/events/klausuren.txt
- content/txt/events/projekte.txt
- content/txt/events/veranstaltungen.txt

3) Stundenplan
- content/stundenplan.json (strukturiertes Modell)
- content/stundenplan.pdf.raw.json (Rohdaten)
- content/timetables/*.pdf (neueste PDF wird automatisch als Referenz gesetzt)

4) Bilder
- assets/images/class-*.jpg (Klassenfotos, z. B. class-ht11.jpg)
- content/images/slideshow/
- content/images/ui/


5) Logo-/Icon-Dateinamen (bitte stabil halten)
- assets/icons/tv-background.jpg (TV-Hintergrund, einzige Referenz)
- assets/tv-slides/slides.json (wird automatisch aus assets/tv-slides/ erzeugt)
- assets/icons/school-logo-header.svg
- assets/icons/school-logo-tv.svg
- assets/icons/favicon-school.svg
- assets/icons/apple-touch-icon-school.svg
- assets/icons/app-icon-192.svg
- assets/icons/app-icon-512.svg
- assets/icons/app-icon-512-maskable.svg

Bei Austausch: gleiche Namen behalten, nur Dateiinhalt ersetzen.


Automations-Skript (Maintainer/CI):
- node scripts/generate-sw-assets.mjs
  - erzeugt TV-Slides-Liste automatisch
  - setzt Stundenplan-Referenz auf neueste PDF
  - aktualisiert Service-Worker-Assets
