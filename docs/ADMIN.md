# Admin-Anleitung

Alles, was du im Adminbereich der HGH-App tun kannst — ohne technische
Vorkenntnisse.

- [Anmeldung](#anmeldung)
- [Stundenplan](#stundenplan)
- [Ankündigungen](#ankündigungen)
- [Bilder](#bilder)
- [Rückmeldungen](#rückmeldungen)
- [Einstellungen](#einstellungen)
- [Häufige Probleme](#häufige-probleme)

---

## Anmeldung

1. App im Browser öffnen und `/admin` an die Adresse hängen
   (z. B. `https://deine-app.de/admin`).
2. Benutzername (Standard `Admin`, Groß- und Kleinschreibung egal) und Passwort
   eingeben, dann **Anmelden**.

Das Passwort bekommst du von der IT-Betreuung; beim allerersten Login lautet es
`admin`. Dabei wird das Konto angelegt — und der Adminbereich lässt dich
zunächst **nur ein eigenes Passwort vergeben**. Erst danach ist alles andere
freigeschaltet.

Deine Sitzung läuft nach **12 Stunden** ab; dann meldest du dich einfach erneut
an. Abmelden kannst du dich jederzeit über den Knopf in der Kopfzeile.

Der Adminbereich hat fünf Bereiche: **Stundenplan**, **Ankündigungen**,
**Bilder**, **Rückmeldungen** und **Einstellungen**.

---

## Stundenplan

### Plan hochladen

1. Tab **Stundenplan** öffnen und die PDF-Datei auswählen.
2. Die Datei wird sofort **in deinem Browser** ausgewertet — hochgeladen ist
   noch nichts. Deshalb siehst du direkt, ob das PDF richtig gelesen wurde.
3. **Vorschau prüfen**: Sie zeigt, wie viele Klassen und Stunden erkannt wurden.
   Klappe eine Klasse auf, um Tag für Tag Fächer, Lehrkräfte und Räume zu sehen.
4. Stimmt alles: **Hochladen**. Stimmt es nicht: **Verwerfen**.

Oben im Tab steht der Schalter **„Immer den neuesten Plan anzeigen“**. Er ist
eingeschaltet, solange niemand ihn ändert:

| Schalter | Was passiert nach dem Hochladen |
|---|---|
| **an** | Der neue Plan ist sofort in der App zu sehen (der Knopf heißt dann „Hochladen und anzeigen“). |
| **aus** | Der Plan liegt erst nur in der Liste. Er wird angezeigt, sobald du auf **Aktivieren** klickst. |

### Dateiname

Damit Kalenderwoche und Halbjahr automatisch übernommen werden:

```
Stundenplan_kw_XX_HjY_YYYY_YY.pdf     Beispiel: Stundenplan_kw_12_Hj2_2025_26.pdf
```

| Teil | Bedeutung | Beispiel |
|---|---|---|
| `kw_XX` | Kalenderwoche | `kw_12` = Woche 12 |
| `HjY` | Halbjahr (1 oder 2) | `Hj2` = zweites Halbjahr |
| `YYYY_YY` | Schuljahr | `2025_26` = 2025/26 |

Ein anders benannter Plan lässt sich trotzdem hochladen — dann fehlen nur Woche
und Halbjahr.

### Status in der Liste

| Status | Bedeutung |
|---|---|
| **Bereit zur Aktivierung** | Eingelesen, aber noch nicht sichtbar |
| **Aktiv** | Dieser Plan wird gerade angezeigt |
| **Archiviert** | War einmal aktiv, lässt sich jederzeit wieder aktivieren |
| **Fehler** | Beim Speichern ging etwas schief |

### Gut zu wissen

- Höchstens **20 MB** pro PDF, nur PDF-Dateien.
- **Alle Seiten** werden ausgewertet und zusammengeführt.
- Es ist immer nur **ein** Plan aktiv; beim Aktivieren wird der bisherige
  archiviert.
- Ist kein Plan aktiv, zeigt die App den zuletzt archivierten.
- Den aktiven Plan kannst du nicht löschen — erst einen anderen aktivieren.

---

## Ankündigungen

Links das Formular, rechts die Liste.

### Neu erstellen

| Feld | Pflicht | Bedeutung |
|---|---|---|
| **Titel** | ja | Kurze Überschrift |
| **Start** | ja | Ab wann die Ankündigung sichtbar ist |
| **Ende/Ablauf** | nein | Wann sie verschwindet. Leer = dauerhaft sichtbar. |
| **Klassen** | nein | Nur für diese Klassen sichtbar, z. B. `HT11, G21`. Leer = für alle. |
| **Als Sondertermin hervorheben** | nein | Zeigt die Ankündigung zusätzlich hervorgehoben **über dem Stundenplan** — für wichtige Meldungen. |
| **Text** | nein | Der ausführliche Inhalt, mehrzeilig möglich |

Dann auf **Erstellen** klicken.

### Bearbeiten und löschen

- **Bearbeiten**: rechts in der Liste auf den Titel klicken, Felder ändern,
  **Aktualisieren**.
- **Löschen**: in der Liste auf **Löschen** klicken und bestätigen.
- **Neues Formular** setzt alle Felder zurück, wenn du statt der begonnenen
  Änderung lieber etwas Neues anlegen willst.

---

## Bilder

Die Bilder aus diesem Tab laufen als Slideshow auf dem Wandbildschirm (`/tv`)
und stehen in der Galerie unter **Weiteres** — zum Beispiel Werkstücke, Plakate
oder Fotos von Veranstaltungen.

Bilder auswählen (mehrere gleichzeitig möglich) und **Hochladen**. Sie wechseln
sich auf dem Wandbildschirm alle 15 Sekunden in der Reihenfolge des Hochladens
ab; die Pinnwand bleibt daneben sichtbar. Zum Entfernen auf **Löschen** unter
dem Bild klicken.

| Regel | Wert |
|---|---|
| Formate | JPG, PNG, GIF, WebP |
| Maximale Größe | 8 MB pro Bild |

Ohne hochgeladene Bilder zeigt die TV-Ansicht einfach keine Slideshow.

---

## Rückmeldungen

Hier landen die Meldungen aus dem Formular unter **Weiteres** — Fehler, Ideen,
Hinweise auf falsche Stundenpläne. Zu jeder Meldung stehen Kategorie, Datum,
die Seite, von der sie abgeschickt wurde, sowie Klasse und Kontakt, falls
angegeben.

Über den Filter siehst du **Offene**, **Erledigte** oder **Alle**. Bearbeitete
Meldungen markierst du als **erledigt** (das lässt sich zurücknehmen) oder
löschst sie.

---

## Einstellungen

Die Karten dieses Tabs werden gemeinsam mit **Alles speichern** übernommen —
außer der Passwortänderung ganz unten, die einen eigenen Knopf hat.

### Überschrift des Wandbildschirms

Der Name der Schule, der als Überschrift auf `/tv` steht — sonst nirgends. Leer
lassen bedeutet „Holztechnik und Gestaltung Hildesheim“.

### Google-Kalender

In Google Kalender unter **Einstellungen → Kalender integrieren** den
Einbettungs-Link kopieren, hier einfügen und **Hinzufügen** klicken. Mehrere
Kalender sind möglich. Ohne Eintrag zeigt die App einen einfachen Monatskalender.

### Ferien und freie Tage

Ferienzeiträume mit Start- und Enddatum eintragen. In diesen Zeiträumen zeigt
die Startseite eine Ferien-Meldung statt des Countdowns. Die **gesetzlichen
Feiertage in Niedersachsen** sind fest hinterlegt und brauchen keinen Eintrag.

### Tagesmeldungen

Kurze Sprüche, die auf der Startseite je nach Tageszeit erscheinen. Das Feld
erwartet JSON; Aufbau und Beispiele stehen in
[Tagesmeldungen und Ferienzeiten](CONTENT_FORMATS.md). Wird nichts gebraucht,
bleibt `{}` stehen. Beim Speichern wird geprüft, ob das JSON gültig ist — bei
einem Tippfehler bekommst du eine Meldung, statt dass die Startseite kaputtgeht.

### Passwort ändern

Du brauchst dein bisheriges Passwort. Für das neue gibt es **keine Vorgabe zur
Länge** — wähle trotzdem etwas, das nicht zu erraten ist.

Nach dem Ändern bleibst du auf diesem Gerät angemeldet, **alle anderen Geräte
werden abgemeldet**. Das ist Absicht: Ist ein Passwort in falsche Hände geraten,
soll niemand über ein offenes Fenster angemeldet bleiben. Ändere das Passwort
deshalb auch, wenn du den Adminbereich von jemandem übernimmst.

---

## Häufige Probleme

### „Ungültige Anmeldedaten“

- Benutzername prüfen (Standard `Admin`), Passwort auf Groß- und Kleinschreibung
  prüfen.
- Steht über dem Anmeldeformular ein **gelber Hinweis**, liegt es nicht am
  Passwort, sondern an der Einrichtung. Gib den Hinweis genau so an die
  IT-Betreuung weiter.

### „Im PDF wurde kein Stundenplan erkannt“

Diese Meldung kommt schon beim Auswählen der Datei, vor dem Hochladen.

- Es muss eine PDF-Datei sein, kein Foto und kein Scan: Ein eingescanntes Blatt
  ist nur ein Bild und enthält keinen lesbaren Text.
- Hilft das nicht, das PDF aus dem Programm, das den Plan erstellt, neu
  exportieren.

### Die Vorschau meldet etwas zum Prüfen

Ist sich die Auswertung an einer Stelle nicht sicher — etwa wenn für eine Klasse
kein einziger Raum erkannt wurde oder ein Wochentag fehlt —, steht das als
gelber Kasten in der Vorschau. Hochladen lässt sich der Plan trotzdem; sieh die
genannte Klasse vorher durch.

Steht dort, das PDF enthalte **keine gezeichnete Tabelle**, wurde der Plan nur
anhand der Lage der Texte geschätzt. Er stimmt dann meistens, aber nicht sicher
— in dem Fall besonders genau prüfen.

### Die Vorschau zeigt zu wenige oder falsche Klassen

Klappe die betroffene Klasse auf: Dort steht Stunde für Stunde, was gelesen
wurde. Stimmt das nicht, den Plan **nicht** hochladen, sondern **Verwerfen** und
der IT-Betreuung Bescheid geben — am besten zusammen mit der PDF-Datei.

### Änderungen sind nicht sichtbar

- Ist der neue Plan wirklich **aktiv**?
- Seite neu laden (**Strg + Umschalt + R**, auf dem Mac **Cmd + Umschalt + R**).
- Auf dem Handy die App kurz schließen und neu öffnen.

### Ankündigung wird nicht angezeigt

- **Start** liegt in der Zukunft, oder das **Ablaufdatum** ist vorbei.
- Im Feld **Klassen** stehen Klassen — dann sehen nur diese die Ankündigung.

### Passwort vergessen

Dafür gibt es bewusst keinen Selbstbedienungsweg. Die IT-Betreuung setzt das
Konto zurück:

```bash
# Konto löschen — Stundenpläne und Ankündigungen bleiben erhalten
npx wrangler d1 execute hgh-app-db --remote \
  --command "DELETE FROM users WHERE username = 'Admin'"
```

Danach ist die Ersteinrichtung wieder aktiv: Der nächste Login mit `Admin` und
dem Standardpasswort `admin` legt das Konto neu an. **Melde dich unmittelbar
danach an** — bis dahin kann jeder, der den Benutzernamen kennt, sich das Konto
nehmen.

### Sitzung abgelaufen

Nach 12 Stunden meldet die App dich ab. Einfach erneut anmelden, es geht nichts
verloren.

---

## Wenn gar nichts hilft

Screenshot der Fehlermeldung machen, notieren, was du direkt davor getan hast
(„PDF hochgeladen, dann auf Aktivieren geklickt“), und beides an die
IT-Betreuung geben.
