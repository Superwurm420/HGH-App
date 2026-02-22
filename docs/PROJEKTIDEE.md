# Projektidee

## Zweck
Die HGH-App ist eine einfache PWA für Schüler:innen, damit der aktuelle Stundenplan schnell auf Handy oder Tablet verfügbar ist.

## Produktprinzipien
1. **Einfachheit vor Funktionsvielfalt**
2. **Dateibasierte Pflege** (ohne komplexes Admin-System)
3. **Klarer Nutzerfokus**: Klasse wählen, Plan sehen, fertig
4. **Fehlertoleranz**: lieber teilweise anzeigen als leerer Bildschirm
5. **Transparenz**: Original-PDF ist immer über Button erreichbar

## Mindestumfang (MVP)
- Klassenauswahl beim ersten Öffnen
- Stundenplanansicht pro Klasse (`HT11`, `HT12`, `HT21`, `HT22`, `G11`, `G12`, `GT01`)
- Sondertermine als Abweichungen vom normalen Plan
- Darkmode
- Offline-Basis (zuletzt geladene Inhalte)

## Fachliche Kernregeln
- Sondertermine können einzelne Klassen oder mehrere Klassen betreffen.
- Sondertermine können einzelne Blöcke, halbe Tage, ganze Tage oder längere Zeiträume betreffen.
- Bei Überschneidung gilt: **Sondertermin überschreibt regulären Unterricht**.
- App-Sprache ist Deutsch.

## Erweiterungen (geplant)
- Google-Kalender-Einbindung
- Pinnwand/Ankündigungen aus Textdateien
- Push-Benachrichtigungen

## Nicht-Ziele für den Start
- Kein Login-/Rollensystem
- Kein komplexes Redaktionsbackend
- Keine manuelle Fach-/Lehrer-/Raum-Stammdatenpflege
