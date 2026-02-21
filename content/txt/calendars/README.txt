Kalender-Konfiguration (für Admins)

Primärdatei:
- `files.txt`
- Format je Zeile: `Name|ICS-URL`

Beispiel:
Schulkalender|https://calendar.google.com/calendar/ical/abc%40group.calendar.google.com/public/basic.ics

Hinweise:
- Kommentare mit `#`
- Leere Zeilen erlaubt
- Fallback auf `schule.txt`, `klasse-hgt2.txt`, `ferien.txt`, wenn `files.txt` fehlt/leer ist

Verbindlicher Contract:
- `docs/contracts/calendar-files.md`
