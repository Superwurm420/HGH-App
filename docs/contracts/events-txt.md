# Contract: `content/txt/events/*.txt`

## Zweck
Ankündigungen für Home/TV.

## Empfohlenes Format
Kopfbereich mit Feldern, dann `---`, dann Text:

```txt
id: klausur-ht22-2026-03-18
titel: Mathe-Klausur HT22
start: 2026-03-18 09:50
ende: 2026-03-18 11:20
ort: Raum 5
sichtbar: ja
reihenfolge: 1
---
Klausur zu Analysis.
```

## Pflicht
- `titel`
- Text nach `---`

## Datumsformat
- `YYYY-MM-DD`
- `YYYY-MM-DD HH:MM`

## Sichtbarkeit
- `sichtbar: ja|nein`
