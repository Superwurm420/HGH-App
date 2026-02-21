# Contract: `content/stundenplan.json`

## Mindeststruktur
```json
{
  "meta": {
    "updatedAt": "2026-02-21T12:00:00.000Z",
    "source": "current.pdf"
  },
  "timeslots": [{ "id": "1", "time": "08:00–08:45" }],
  "classes": {
    "HT11": {
      "mo": [{ "slotId": "1", "subject": "Deutsch", "teacher": "MEL", "room": "6" }],
      "di": [], "mi": [], "do": [], "fr": []
    }
  }
}
```

## Regeln
- `classes.<Klasse>.<day>` muss Array sein (`mo`,`di`,`mi`,`do`,`fr`).
- `slotId` muss zu `timeslots[].id` passen.
- PDF-Link kommt aus `meta.source`.

## Hinweise zu Sonderterminen
Sondertermine aus PDF-Rohdaten unterstützen in Tokens u. a.:
- `day: woche`, `day: mo-fr`, `day: mo,mi,fr`
- `slot: 1-9`, `slot: 1,3-4,8`
