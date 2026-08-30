# Tagesmeldungen und Ferienzeiten

Beides pflegst du im **Adminbereich → Einstellungen**; Änderungen sind sofort
nach dem Speichern live. Die Ferienzeiträume trägst du dort bequem über
Datumsfelder ein — diese Anleitung erklärt vor allem das Feld
**Tagesmeldungen**, das JSON erwartet.

Eine fertige Vorlage mit deutschen Beispieltexten liegt unter
[`docs/tagesmeldungen.json`](tagesmeldungen.json): Inhalt kopieren, ins Feld
einfügen, anpassen.

---

## Tagesmeldungen

Die Startseite zeigt kurze Meldungen, die zur Situation passen. Welche
Kategorie gilt, entscheidet die App selbst:

| Kategorie | Wann |
|---|---|
| `vorUnterricht` | morgens vor Unterrichtsbeginn |
| `inPause` | in den Pausen |
| `nachUnterricht` | nach der letzten Stunde |
| `wochenende` | samstags und sonntags |
| `feiertag` | an gesetzlichen Feiertagen in Niedersachsen |
| `freierTag` | an schulfreien Tagen aus den Ferienzeiträumen |

Je Kategorie kannst du mehrere Texte hinterlegen; angezeigt wird ein zufällig
gewählter davon.

### Aufbau

```json
{
  "standard": {
    "vorUnterricht": [
      "Guten Morgen! Gleich startet dein Schultag.",
      "Früher Start, klarer Kopf – auf einen guten Schultag!"
    ],
    "inPause": ["Pause: durchatmen, trinken, kurz abschalten."],
    "nachUnterricht": ["Unterricht geschafft – guten Feierabend!"],
    "wochenende": ["Wochenende – genieße deine freie Zeit!"],
    "feiertag": ["Heute ist unterrichtsfrei – hab einen schönen Feiertag!"],
    "freierTag": ["Heute ist schulfrei – genieße den Tag!"]
  }
}
```

Einen Text ergänzen heißt: eine weitere Zeile in die eckigen Klammern der
Kategorie schreiben. Jeder Text steht in geraden Anführungszeichen, zwischen
zwei Texten steht ein Komma — nach dem letzten keins.

```json
"inPause": [
  "Pause: durchatmen, trinken, kurz abschalten.",
  "Kurze Verschnaufpause – gleich geht es weiter!"
]
```

### Texte für einzelne Klassen

Neben `"standard"` kannst du einen Bereich `"klassen"` anlegen. Diese Texte
haben Vorrang; jede Kategorie, die dort fehlt, fällt auf den Standard zurück.

```json
"klassen": {
  "HT11": {
    "vorUnterricht": ["HT11: Werkzeug checken, dann startet ihr sauber in den Tag."]
  }
}
```

### Felder mit `_hinweis`

Einträge, deren Name mit `_hinweis` beginnt, sind reine Notizen für dich — die
App ignoriert sie.

---

## Ferien und freie Tage

Die Zeiträume trägst du über die Datumsfelder ein. **Start und Ende zählen
beide mit**; für einen einzelnen freien Tag trägst du bei beidem dasselbe Datum
ein. Für jedes neue Schuljahr kommen neue Zeiträume dazu.

Gesetzliche Feiertage in Niedersachsen sind fest in der App hinterlegt und
brauchen keinen Eintrag.

Gespeichert wird das Ganze so — relevant nur, wenn du den Inhalt einmal
sichern oder von Hand übertragen willst:

```json
{
  "ranges": [
    { "start": "2025-10-13", "end": "2025-10-25" },
    { "start": "2026-05-15", "end": "2026-05-15" }
  ]
}
```

Das Datum steht dabei als `JJJJ-MM-TT` — also mit dem Jahr vorne, **nicht** im
deutschen Format `TT.MM.JJJJ`.

---

## Sicher bearbeiten

- **Sicherheitskopie anlegen**, bevor du etwas änderst: Feldinhalt markieren,
  kopieren und außerhalb der App ablegen. Speichern überschreibt den bisherigen
  Stand, eine frühere Fassung hält die App nicht vor.
- **Kleine Änderungen** machen und direkt ansehen.
- Im Zweifel den Feldinhalt bei [jsonlint.com](https://jsonlint.com) prüfen —
  bei einem Fehler steht dort die Zeilennummer.
- Texte **nicht in Word** schreiben: Word macht aus geraden Anführungszeichen
  typografische („…“), mit denen das JSON ungültig wird. Der Adminbereich selbst
  oder ein einfacher Texteditor gehen problemlos.

Beim Speichern prüft die App das JSON. Bei einem Tippfehler bekommst du eine
Meldung und die alte Fassung bleibt erhalten.

| Häufiger Fehler | Falsch | Richtig |
|---|---|---|
| Komma zwischen Einträgen fehlt | `"Text 1" "Text 2"` | `"Text 1", "Text 2"` |
| Komma nach dem letzten Eintrag | `"Text 1", "Text 2",` | `"Text 1", "Text 2"` |
| Typografische Anführungszeichen | `„Text“` | `"Text"` |
| Klammer fehlt | `"inPause": [ "Text"` | `"inPause": [ "Text" ]` |
