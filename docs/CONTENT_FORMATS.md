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
  }
}
```

### Auswahllogik in der App
1. Die App bestimmt die Zeitkategorie anhand des Stundenplans der ausgewählten Klasse.
2. Kategorien an Unterrichtstagen: `vorUnterricht`, `inPause`, `nachUnterricht`.
3. Am Wochenende wird `standard.wochenende` verwendet.
4. An Wochentagen ohne Unterricht wird unterschieden:
   - Gesetzlicher Feiertag in Niedersachsen → `standard.feiertag`
   - Sonstiger schulfreier Tag/Ferien in Niedersachsen → `standard.freierTag`

### Hinweise
- Zusätzliche Hinweisfelder wie `_hinweis` sind erlaubt und werden ignoriert.
- Es gibt keine stunden- oder klassenspezifischen Tagesmeldungen mehr.
