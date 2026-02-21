# Contract: `content/txt/calendars/files.txt`

## Zweck
Konfiguriert alle Kalenderquellen für das Kalender-Widget.

## Format
- Eine Zeile je Kalender
- Muster: `Name|ICS-URL`
- Kommentare mit `#`
- Leere Zeilen erlaubt

## Gültig
```txt
Schulkalender|https://calendar.google.com/calendar/ical/abc%40group.calendar.google.com/public/basic.ics
```

## Ungültig
```txt
Schulkalender - https://...   # falscher Trenner
|https://...                  # Name fehlt
Schulkalender|               # URL fehlt
```
