# Content-Formate (verbindlich)

## 1) Stundenplan-PDF

### Dateimuster
`Stundenplan_kw_XX_HjY_YYYY_YY.pdf`

Beispiel:
`Stundenplan_kw_09_Hj2_2025_26.pdf`

### Bedeutung
- `XX`: Kalenderwoche (01-53)
- `Y`: Halbjahr (`1` oder `2`)
- `YYYY_YY`: Schuljahr (Startjahr + Endjahr kurz)

### Auswahl der neuesten Datei
Sortierung absteigend nach:
1. `YYYY`
2. `HjY` (2 vor 1)
3. `kw_XX`

## 2) Pinnwand-TXT

### Format
```txt
title: Elternabend Klasse 2
date: 24.06.2026 08:30
audience: Für HT11 und HT22
classes: HT11, HT22
expires: 30.06.2026 16:00
highlight: false
---
Morgen entfällt die 3.+4. Stunde.
```

### Feldregeln
- Pflicht: `title`, `date`
- Optional: `audience`, `classes`, `expires`, `highlight`
- Datumsformat: `TT.MM.JJJJ HH:mm`
- Zeitzone: `Europe/Berlin`
- `highlight`: `true/ja/1` (zusätzlich als Sondertermin im Stundenplan) oder `false/nein/0` (nur Pinnwand)
- Kommentarzeilen sind erlaubt (`#`, `//`, `;`)

### Fehlerregeln
- Teilweise lesbar: nutzbare Felder werden angezeigt, plus Warnhinweis
- Nicht lesbar: Fehlermeldung anzeigen
- `expires` fehlt: Beitrag bleibt aktiv

## 3) Sondertermine
Sondertermine sind alle Abweichungen vom Standardunterricht und dürfen:
- nur eine Klasse betreffen,
- mehrere Klassen betreffen,
- einzelne Blöcke, halbe Tage oder längere Zeiträume abdecken.

Bei Überschneidung hat Sondertermin immer Vorrang.

## 4) Tagesmeldungen (`messages.json`)

Datei: `public/content/messages.json`

### Ziel
- Meldungen auf der Startseite passend zur ausgewählten Klasse und zum aktuellen Tageszeitfenster.
- Datei soll ohne Codekenntnisse editierbar sein.

### Struktur
```json
{
  "_hinweis": "Freitext-Hinweis für Redakteure",
  "standard": {
    "vorUnterricht": ["..."],
    "inPause": ["..."],
    "nachUnterricht": ["..."],
    "wochenende": ["..."],
    "feiertag": ["..."],
    "freierTag": ["..."]
  },
  "klassen": {
    "HT11": {
      "vorUnterricht": ["..."],
      "inPause": ["..."],
      "nachUnterricht": ["..."]
    }
  }
}
```

### Auswahllogik in der App
1. Die App bestimmt die Zeitkategorie anhand des Stundenplans der ausgewählten Klasse.
2. Falls für die gewählte Klasse passende Einträge in `klassen.<KLASSE>.<kategorie>` vorhanden sind, werden diese bevorzugt genutzt.
3. Fehlen dort Einträge, fällt die App automatisch auf `standard.<kategorie>` zurück.
4. Kategorien an Unterrichtstagen: `vorUnterricht`, `inPause`, `nachUnterricht`.
5. Am Wochenende wird `wochenende` verwendet.
6. An Wochentagen ohne Unterricht wird unterschieden:
   - Gesetzlicher Feiertag in Niedersachsen → `feiertag`
   - Sonstiger schulfreier Tag/Ferien laut `public/content/schulferien-nds.json` → `freierTag`
7. Wenn für ein Jahr keine Ferienbereiche gepflegt sind, werden dafür keine `freierTag`-Meldungen ausgelöst.
8. Die Meldung aktualisiert sich laufend (spätestens jede Minute), damit der Wechsel zwischen Zeitkategorien ohne Neuladen sichtbar wird.

### Hinweise
- Zusätzliche Hinweisfelder wie `_hinweis` sind erlaubt und werden ignoriert.
- Für jede Klasse sind optional eigene Meldungen möglich (`klassen.<KLASSE>`). Nicht gepflegte Kategorien nutzen automatisch `standard`.


## 5) Schulferien (Niedersachsen)

Datei: `public/content/schulferien-nds.json`

### Struktur
```json
{
  "_hinweis": "Freitext",
  "ranges": [
    { "start": "2026-07-02", "end": "2026-08-12" }
  ]
}
```

### Feldregeln
- `ranges` ist eine Liste von Zeitbereichen.
- `start` und `end` sind Pflichtfelder im Format `YYYY-MM-DD`.
- `start` darf nicht nach `end` liegen.

### Verhalten in der App
- Die Datei wird beim Build automatisch eingelesen.
- Liegt das aktuelle Datum in einem Bereich, nutzt die Tagesmeldung `standard.freierTag`.
- Gibt es für das aktuelle Jahr keine Bereiche, wird **kein** Ferien-`freierTag` angenommen.
