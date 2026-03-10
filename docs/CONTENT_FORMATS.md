# Inhalte pflegen – einfach erklärt

Diese Datei erklärt die wichtigsten Inhaltsdateien so, dass man sie ohne Programmierwissen pflegen kann.

---

## 1) Tagesmeldungen (`public/content/messages.json`)

### Wofür ist die Datei?
Hier stehen kurze Texte, die in der App je nach Situation angezeigt werden, z. B.:
- vor dem Unterricht,
- in Pausen,
- nach dem Unterricht,
- an Wochenenden oder freien Tagen.

### Einfaches Beispiel

```json
{
  "standard": {
    "vorUnterricht": ["Guten Morgen und einen guten Start!"],
    "inPause": ["Zeit für eine kurze Pause."],
    "nachUnterricht": ["Schönen Feierabend!"],
    "wochenende": ["Schönes Wochenende!"],
    "feiertag": ["Heute ist Feiertag."],
    "freierTag": ["Heute ist unterrichtsfrei."]
  }
}
```

### Wichtige Regeln
- Immer auf gültiges JSON achten (Kommas, Klammern, Anführungszeichen).
- Jede Kategorie enthält eine **Liste** (`[...]`) mit möglichen Texten.
- Die App nimmt automatisch passende Meldungen je nach Tag/Uhrzeit.

---

## 2) Ferienzeiten (`public/content/schulferien-nds.json`)

### Wofür ist die Datei?
Hier trägst du Ferienzeiträume ein. Dann erkennt die App diese Tage als unterrichtsfrei.

### Beispiel

```json
{
  "ranges": [
    { "start": "2025-10-13", "end": "2025-10-25" },
    { "start": "2025-12-22", "end": "2026-01-05" }
  ]
}
```

### Wichtige Regeln
- Datumsformat immer: `YYYY-MM-DD`
- `start` und `end` zählen jeweils mit (inklusive)
- Für jedes neue Schuljahr neue Zeiträume ergänzen

---

## 3) Tipps für sicheres Bearbeiten

1. Vor Änderungen eine Sicherheitskopie anlegen.
2. Nach Änderungen prüfen, ob die Datei noch gültiges JSON ist.
3. Kleine Änderungen machen und direkt testen.
4. Wenn etwas nicht angezeigt wird: zuerst auf fehlende Kommas/Anführungszeichen prüfen.

---

## 4) Was macht die App automatisch?

- Sie erkennt Wochenenden selbst.
- Sie unterscheidet Feiertag und andere freie Tage.
- Sie wählt je nach Situation die passende Meldung aus.

Du musst also vor allem nur die Texte und Ferienbereiche aktuell halten.
