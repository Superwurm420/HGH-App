# Inhaltspflege – Schnellanleitung für Mitwirkende

Diese Anleitung ist für Personen gedacht, die Inhalte tauschen möchten, ohne Code zu schreiben.

## 1) Stundenplan aktualisieren
1. PDF korrekt benennen (siehe Formatregel):
   `Stundenplan_kw_XX_HjY_YYYY_YY.pdf`
2. Datei in `public/content/timetables/` ablegen.
3. Alte Dateien dürfen als Archiv liegen bleiben.
4. Commit + Push.

## 2) Pinnwand aktualisieren
1. Neue `.txt` in `public/content/announcements/` anlegen.
2. Vorlage aus `templates/announcement-template.txt` verwenden.
3. Formatfelder ausfüllen (`title`, `date`; optional `audience`, `expires`).
4. Commit + Push.

## 3) Branding austauschen
1. Logos/Bilder in `public/content/branding/` ersetzen.
2. Dateinamen möglichst stabil halten.
3. Commit + Push.

## 4) Vor dem Push prüfen
```bash
node scripts/validate-content.mjs
```

## 5) Verhalten in der App
- Nutzer:innen können jederzeit die Original-PDF öffnen (Button "Original-PDF anzeigen").
- Bei fehlerhaften TXT-Daten: Warnung, soweit möglich trotzdem Anzeige.
