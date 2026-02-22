# Architektur-Grundlage

## Verzeichnisstruktur
```text
public/
  content/
    timetables/      # Original-PDFs
    announcements/   # Pinnwand-TXT
    branding/        # Logo, Hintergründe, Farben
scripts/
  validate-content.mjs
  select-latest-timetable.mjs
templates/
  announcement-template.txt
```

## Datenfluss Stundenplan
1. PDF wird nach `public/content/timetables/` gelegt.
2. Dateiname wird auf KW/HJ/Schuljahr geprüft.
3. Neueste Datei wird über Sortierlogik ermittelt.
4. Parser extrahiert je Klasse Inhalte.
5. UI zeigt Plan an und bietet **"Original-PDF anzeigen"**.

## Parsing-Annahmen aus dem Stundenplan
- Klassenköpfe: `HT11`, `HT12`, `HT21`, `HT22`, `G11`, `G12`, `GT01`
- Linke Spalte enthält Zeiten
- Mittagspause liegt an einer konstanten Stelle
- Fach/Lehrer stehen alternierend in den Zellen
- Spalte `R` enthält Raumangaben
- Fächer, Lehrerkürzel und Räume sind variabel

## Prioritätsmodell
Bei Konflikten in demselben Zeitslot:
1. Sondertermin
2. Reguläre Unterrichtseinträge

## Fehlerverhalten (robust)
- Teilweise lesbar: erkannte Inhalte anzeigen + Hinweis auf unvollständige Erkennung
- Unlesbar: klare Fehlermeldung + App bleibt bedienbar
- Pinnwand ohne `expires`: Eintrag bleibt gültig

## Erweiterungsschnittstellen (vorbereitet)
- Kalenderdaten als separater Datenprovider (später Google Calendar)
- Pinnwand weiterhin dateibasiert (TXT), damit Pflege niedrigschwellig bleibt
