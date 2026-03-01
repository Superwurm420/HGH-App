

Sondertermine
Sondertermine sind alle Abweichungen vom Standardunterricht und dürfen:
- nur eine Klasse betreffen,
- mehrere Klassen betreffen,
- einzelne Blöcke, halbe Tage oder längere Zeiträume abdecken.


Tagesmeldungen (`messages.json`)

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
2. Falls für die gewählte Klasse passende Einträge in `klassen.<KLASSE>.<kategorie>` vorhanden sind, werden diese bevorzugt genutzt.
3. Fehlen dort Einträge, fällt die App automatisch auf `standard.<kategorie>` zurück.
4. Kategorien an Unterrichtstagen: `vorUnterricht`, `inPause`, `nachUnterricht`.
5. Am Wochenende wird `wochenende` verwendet.
6. An Wochentagen ohne Unterricht wird unterschieden:
   - Gesetzlicher Feiertag in Niedersachsen → `feiertag`
   - Alle übrigen unterrichtsfreien Wochentage → `freierTag`
   - Ferienbereiche aus `public/content/schulferien-nds.json` werden zusätzlich als `freierTag` erkannt.
7. Die Meldung aktualisiert sich laufend (spätestens alle 10 Minute), 



Schulferien (Niedersachsen):

Datei: `public/content/schulferien-nds.json`

