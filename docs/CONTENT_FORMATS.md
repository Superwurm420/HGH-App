# Tagesmeldungen und Ferienzeiten — einfach erklärt

Diese Anleitung erklärt den Aufbau der **Tagesmeldungen** und der
**Ferienzeiträume**.

---

## Wo pflege ich das?

Beides im **Adminbereich unter „Einstellungen"** — du brauchst keinen Dateizugriff
und niemanden aus der IT:

| Was | Wo |
|---|---|
| Tagesmeldungen | Adminbereich → Einstellungen → *Tagesmeldungen* |
| Ferienzeiträume | Adminbereich → Einstellungen → *Ferien und freie Tage* |

Änderungen sind sofort nach dem Speichern live.

> Früher lagen diese Werte als Dateien unter `public/content/`. Das ist vorbei —
> die Dateien gibt es nicht mehr, alles steht jetzt in der Datenbank.

Für den Anfang liegt eine fertige Vorlage mit deutschen Beispieltexten unter
[`docs/tagesmeldungen.json`](tagesmeldungen.json). Ihren Inhalt kannst du komplett
in das Feld *Tagesmeldungen* kopieren und dann anpassen.

---

## 1) Tagesmeldungen

### Wofür ist das Feld?

Die App zeigt auf der Startseite kurze Meldungen an, die zur Situation passen — z. B. morgens vor dem Unterricht, in der Pause, am Wochenende oder in den Ferien. Diese Texte trägst du im Feld *Tagesmeldungen* ein.

### Die 6 Kategorien

Die App wählt automatisch die passende Kategorie je nach Tageszeit und Situation:

| Kategorie | Wann wird sie angezeigt? |
|---|---|
| `vorUnterricht` | Morgens, bevor der Unterricht beginnt |
| `inPause` | In den Pausen zwischen den Unterrichtsstunden |
| `nachUnterricht` | Nach der letzten Stunde des Tages |
| `wochenende` | An Samstagen und Sonntagen |
| `feiertag` | An gesetzlichen Feiertagen in Niedersachsen |
| `freierTag` | An schulfreien Tagen aus den Ferienzeiträumen (siehe unten) |

In jeder Kategorie kannst du **mehrere Texte** eintragen. Die App wählt dann zufällig einen davon aus.

### So sieht der Inhalt aus

```json
{
  "standard": {
    "vorUnterricht": [
      "Guten Morgen! Gleich startet dein Schultag.",
      "Früher Start, klarer Kopf – auf einen guten Schultag!"
    ],
    "inPause": [
      "Pause: durchatmen, trinken, kurz abschalten."
    ],
    "nachUnterricht": [
      "Unterricht geschafft – guten Feierabend!"
    ],
    "wochenende": [
      "Wochenende – genieße deine freie Zeit!"
    ],
    "feiertag": [
      "Heute ist unterrichtsfrei – hab einen schönen Feiertag!"
    ],
    "freierTag": [
      "Heute ist schulfrei – genieße den Tag!"
    ]
  }
}
```

### Einen neuen Text hinzufügen

Wenn du z. B. eine neue Meldung für die Pause ergänzen willst:

**Vorher:**
```json
"inPause": [
  "Pause: durchatmen, trinken, kurz abschalten."
]
```

**Nachher:**
```json
"inPause": [
  "Pause: durchatmen, trinken, kurz abschalten.",
  "Kurze Verschnaufpause – gleich geht es weiter!"
]
```

Achte darauf:
- Jeder Text steht in **Anführungszeichen** (`"..."`)
- Zwischen zwei Texten steht ein **Komma**
- Nach dem letzten Text in einer Liste steht **kein** Komma

### Meldungen für einzelne Klassen

Unterhalb von `"standard"` gibt es einen Bereich `"klassen"`, in dem du Texte für bestimmte Klassen hinterlegen kannst. Diese haben Vorrang vor den Standard-Texten.

```json
"klassen": {
  "HT11": {
    "vorUnterricht": [
      "HT11: Guten Morgen! Werkzeug checken, dann startet ihr sauber in den Tag."
    ]
  }
}
```

- Trage den **Klassencode** ein (z. B. `HT11`, `G21`)
- Du musst nicht alle 6 Kategorien angeben — was du nicht einträgst, fällt automatisch auf den Standard-Text zurück

### Hinweis-Felder (`_hinweis`)

In der Vorlage findest du Einträge, die mit `_hinweis` beginnen, z. B.:

```json
"_hinweis": "Tagesmeldungen für Startseite..."
```

Diese Texte sind **nur Notizen für dich** — die App ignoriert sie komplett. Du kannst sie lesen, um zu verstehen, was wo hingehört.

---

## 2) Ferienzeiten

### Wofür ist das?

Hier trägst du ein, wann schulfreie Tage (Ferien) sind. Die App erkennt diese Tage dann automatisch und zeigt passende Meldungen an (Kategorie `freierTag`).

Die **gesetzlichen Feiertage in Niedersachsen** sind fest in der App hinterlegt und
müssen hier nicht eingetragen werden.

### Aufbau

Die Zeiträume trägst du bequem über die Datumsfelder ein. Gespeichert werden sie so:

```json
{
  "ranges": [
    { "start": "2025-10-13", "end": "2025-10-25" },
    { "start": "2025-12-22", "end": "2026-01-05" },
    { "start": "2026-02-02", "end": "2026-02-03" },
    { "start": "2026-03-23", "end": "2026-04-07" },
    { "start": "2026-05-15", "end": "2026-05-15" },
    { "start": "2026-07-02", "end": "2026-08-12" }
  ]
}
```

### Datumsformat

Das Datum wird im Format **Jahr-Monat-Tag** geschrieben:

```
YYYY-MM-DD
```

| Teil | Bedeutung | Beispiel |
|---|---|---|
| `YYYY` | Jahr (4 Stellen) | `2026` |
| `MM` | Monat (2 Stellen, mit führender Null) | `03` = März |
| `DD` | Tag (2 Stellen, mit führender Null) | `07` = 7. |

**Achtung:** Das ist **nicht** das übliche deutsche Format (TT.MM.JJJJ)! Hier steht das Jahr vorne.

### Wichtige Regeln

- **Start** und **Ende** zählen beide mit (inklusive). Wenn z. B. `"start": "2026-03-23"` und `"end": "2026-04-07"` steht, sind der 23. März und der 7. April beide schulfreie Tage.
- Für einen **einzelnen freien Tag** trägst du Start und Ende als dasselbe Datum ein: `{ "start": "2026-05-15", "end": "2026-05-15" }`
- Für jedes **neue Schuljahr** musst du die neuen Ferienzeiträume ergänzen.

### Neuen Ferienzeitraum hinzufügen

Füge eine neue Zeile innerhalb der eckigen Klammern `[...]` ein:

**Vorher:**
```json
{ "start": "2026-07-02", "end": "2026-08-12" }
```

**Nachher:**
```json
{ "start": "2026-07-02", "end": "2026-08-12" },
{ "start": "2026-10-19", "end": "2026-10-31" }
```

Achte darauf, dass nach jeder Zeile (außer der letzten) ein **Komma** steht.

---

## 3) Tipps für sicheres Bearbeiten

1. **Mache immer eine Sicherheitskopie**, bevor du etwas änderst. Markiere den
   gesamten Feldinhalt, kopiere ihn und sichere ihn außerhalb der App — etwa in
   einer Textdatei. Ein Speichern überschreibt den bisherigen Stand; die App hält
   keine frühere Fassung vor.

2. **Prüfe deine Änderungen** mit einem Online-JSON-Prüfer:
   - Öffne [jsonlint.com](https://jsonlint.com)
   - Kopiere den gesamten Feldinhalt in das Textfeld
   - Klicke auf **Validate JSON**
   - Wenn „Valid JSON" erscheint, ist alles in Ordnung
   - Wenn ein Fehler angezeigt wird, steht dabei die Zeilennummer — dort liegt das Problem

3. **Mache kleine Änderungen** und teste direkt. Ändere nicht zu viel auf einmal.

### Häufige Fehler

| Problem | Beispiel | Lösung |
|---|---|---|
| Komma fehlt zwischen Einträgen | `"Text 1" "Text 2"` | `"Text 1", "Text 2"` |
| Komma nach dem letzten Eintrag | `"Text 1", "Text 2",` | `"Text 1", "Text 2"` |
| Falsche Anführungszeichen | `„Text"` oder `"Text"` | `"Text"` (gerade Zeichen) |
| Klammer fehlt | `"vorUnterricht": [ "Text"` | `"vorUnterricht": [ "Text" ]` |

**Tipp:** Schreibe die Texte direkt im Adminbereich oder in einem einfachen Texteditor
(Notepad, TextEdit) — **nicht** in Word. Word wandelt gerade Anführungszeichen
automatisch in „typografische" um, die hier nicht funktionieren.

Beim Speichern prüft die App, ob der Text gültiges JSON ist. Bei einem Tippfehler
bekommst du eine Meldung und die alte Fassung bleibt erhalten.

---

## 4) Was macht die App automatisch?

- Sie erkennt **Wochenenden** (Samstag, Sonntag) selbstständig.
- Sie erkennt **gesetzliche Feiertage** in Niedersachsen automatisch.
- Sie nutzt die eingetragenen Ferienzeiträume, um **schulfreie Tage** zu erkennen.
- Sie **wählt zufällig** einen Text aus der passenden Kategorie aus.
- Wenn für eine Klasse keine eigene Meldung hinterlegt ist, wird automatisch der **Standard-Text** verwendet.

Du musst also vor allem nur die **Texte** und **Ferienzeiträume** aktuell halten — den Rest erledigt die App.
