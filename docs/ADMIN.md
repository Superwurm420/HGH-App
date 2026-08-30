# Admin-Anleitung — Schritt für Schritt

Diese Anleitung erklärt dir alles, was du im Adminbereich der HGH-App tun kannst. Du brauchst dafür **keine technischen Vorkenntnisse**.

---

## Was kannst du im Adminbereich tun?

Im Adminbereich gibt es fünf Bereiche:

1. **Stundenplan** — PDF-Dateien mit dem aktuellen Stundenplan hochladen und freischalten
2. **Ankündigungen** — Nachrichten erstellen, die auf der Startseite und der Pinnwand erscheinen
4. **Bilder** — Fotos hochladen, die auf dem Wandbildschirm (`/tv`) durchlaufen
5. **Einstellungen** — Google-Kalender, Ferienzeiträume, Tagesmeldungen, Schulname, Passwort ändern

---

## Anmeldung

1. Öffne die App im Browser.
2. Hänge `/admin` an die Adresse an (z. B. `https://deine-app.de/admin`).
3. Gib deinen Benutzernamen und dein Passwort ein:
   - **Benutzername**: `Admin` (Standardwert, kann von der IT geändert werden; Groß-/Kleinschreibung ist beim Anmelden egal)
   - **Passwort**: bekommst du von der IT-Betreuung. Beim allerersten Login lautet es `admin`.
4. Klicke auf **Anmelden**.

**Gut zu wissen:**
- Beim allerersten Login wird dein Adminkonto automatisch erstellt — du musst nichts extra einrichten.
- Danach kommst du **nur noch zur Passwortvergabe**: Solange das Standardpasswort gilt, ist der übrige Adminbereich gesperrt. Vergib dort ein eigenes Passwort, dann ist alles freigeschaltet.
- Deine Sitzung läuft nach **12 Stunden** automatisch ab. Danach musst du dich einfach erneut anmelden.

---

## Stundenplan verwalten

### Neuen Stundenplan hochladen

1. Wechsle zum Tab **Stundenplan**.
2. Klicke auf **Durchsuchen** und wähle die PDF-Datei aus.
3. Die Datei wird sofort ausgewertet — direkt hier im Browser, es wird noch nichts hochgeladen.
4. **Prüfe die Vorschau**: Sie zeigt, wie viele Klassen und Stunden erkannt wurden. Klappe eine Klasse auf, um Tag für Tag zu sehen, welche Fächer, Lehrkräfte und Räume gelesen wurden. Sieht das falsch aus, klicke auf **Verwerfen**.
5. Stimmt alles, klicke auf **Hochladen**.
6. Klicke anschließend in der Liste auf **Aktivieren**.

**Erst nach dem Aktivieren** sehen die Nutzer den neuen Stundenplan in der App!

> Die Auswertung passiert bewusst in deinem Browser. Deshalb siehst du sofort,
> ob das PDF richtig gelesen wurde — und musst nicht erst hochladen und hoffen.

### Dateiname richtig benennen

Damit Kalenderwoche und Halbjahr automatisch erkannt werden, benenne die Datei nach diesem Muster:

```
Stundenplan_kw_XX_HjY_YYYY_YY.pdf
```

**Beispiel:** `Stundenplan_kw_12_Hj2_2025_26.pdf`

| Teil | Bedeutung | Beispiel |
|---|---|---|
| `kw_XX` | Kalenderwoche | `kw_12` = Woche 12 |
| `HjY` | Halbjahr (1 oder 2) | `Hj2` = zweites Halbjahr |
| `YYYY_YY` | Schuljahr | `2025_26` = Schuljahr 2025/26 |

Wenn die Datei anders benannt ist, funktioniert der Upload trotzdem — nur Woche und Halbjahr werden dann nicht automatisch erkannt.

### Status-Bedeutungen

| Status | Was bedeutet das? |
|---|---|
| **Bereit zur Aktivierung** | Alles wurde erkannt — du kannst den Plan jetzt freischalten |
| **Aktiv** | Dieser Plan wird den Nutzern aktuell angezeigt |
| **Archiviert** | Ein früher aktiver Plan. Du kannst ihn jederzeit wieder aktivieren. |
| **Fehler** | Beim Speichern ging etwas schief (siehe unten) |

Probleme beim Lesen der PDF-Datei siehst du schon vor dem Hochladen in der Vorschau —
in der Liste taucht ein unlesbares PDF also gar nicht erst auf.

### Wichtige Hinweise

- **Dateigröße**: Maximal 20 MB pro PDF
- **Seiten**: Ausgewertet wird nur die **erste Seite** des PDFs
- **Dateiformat**: Nur PDF-Dateien werden akzeptiert
- **Nur ein aktiver Plan**: Es kann immer nur ein Stundenplan gleichzeitig aktiv sein. Wenn du einen neuen aktivierst, wird der alte automatisch archiviert.
- **Fallback**: Falls kein Plan aktiv ist, zeigt die App automatisch den letzten archivierten Plan an.
- Einen aktiven Plan kannst du nicht löschen — erst deaktivieren (indem du einen anderen aktivierst), dann löschen.

---

## Ankündigungen verwalten

Wechsle zum Tab **Ankündigungen**. Links siehst du das Formular, rechts die Liste der vorhandenen Ankündigungen.

### Neue Ankündigung erstellen

Fülle die folgenden Felder aus:

| Feld | Pflicht? | Erklärung |
|---|---|---|
| **Titel** | Ja | Eine kurze Überschrift für die Ankündigung |
| **Start (Datum + Uhrzeit)** | Ja | Ab wann die Ankündigung sichtbar sein soll |
| **Ende/Ablauf** | Nein | Wann die Ankündigung automatisch verschwinden soll. Wenn du nichts einträgst, bleibt sie dauerhaft sichtbar. |
| **Klassen** | Nein | Wenn die Ankündigung nur bestimmte Klassen betrifft, trage die Klassenkürzel ein, getrennt durch Kommas. Beispiel: `HT11, G21`. Wenn du das Feld leer lässt, sehen alle Klassen die Ankündigung. |
| **Als Sondertermin anzeigen** | Nein | Wenn du dieses Häkchen setzt, wird die Ankündigung **besonders hervorgehoben oberhalb des Stundenplans** angezeigt. Nutze das für wichtige Meldungen. |
| **Text** | Nein | Der ausführliche Inhalt der Ankündigung (mehrzeilig möglich) |

Klicke anschließend auf **Erstellen**.

### Bestehende Ankündigung bearbeiten

1. Klicke rechts in der Liste auf den **Titel** der Ankündigung, die du ändern möchtest.
2. Das Formular links wird mit den Daten gefüllt.
3. Ändere, was du möchtest.
4. Klicke auf **Aktualisieren**.

### Ankündigung löschen

1. Klicke rechts in der Liste beim gewünschten Eintrag auf den roten **Löschen**-Button.
2. Bestätige die Sicherheitsabfrage.

### Neues Formular

Wenn du gerade eine Ankündigung bearbeitest und stattdessen eine neue erstellen möchtest, klicke auf **Neues Formular** — das setzt alle Felder zurück.

---

## Bilder für den Wandbildschirm

Der Tab **Bilder** füllt die Slideshow auf der TV-Ansicht (`/tv`) — zum Beispiel
mit Werkstücken, Plakaten oder Fotos von Schulveranstaltungen.

1. Wechsle zum Tab **Bilder**.
2. Wähle ein oder mehrere Bilder aus (Mehrfachauswahl ist möglich).
3. Klicke auf **Hochladen**.

Die Bilder wechseln sich auf dem Wandbildschirm alle 15 Sekunden ab, in der
Reihenfolge, in der sie hochgeladen wurden. Die Pinnwand bleibt daneben sichtbar.

| Regel | Wert |
|---|---|
| Formate | JPG, PNG, GIF, WebP |
| Maximale Größe | 8 MB pro Bild |

Zum Entfernen auf **Löschen** unter dem jeweiligen Bild klicken. Solange keine
Bilder hochgeladen sind, zeigt die TV-Ansicht einfach keine Slideshow.

---

## Einstellungen

Im Tab **Einstellungen** pflegst du alles, was nicht Stundenplan, Ankündigung
ist. Änderungen werden erst mit **Alles speichern** übernommen.

### Google-Kalender

Öffne in Google Kalender die Einstellungen des gewünschten Kalenders, gehe zu
**Kalender integrieren** und kopiere den Einbettungs-Link. Diesen hier einfügen
und auf **Hinzufügen** klicken. Du kannst mehrere Kalender eintragen.

Ist kein Kalender eingetragen, zeigt die App einen einfachen Monatskalender.

### Ferien und freie Tage

Trage hier die Schulferien mit Start- und Enddatum ein. In diesen Zeiträumen
zeigt die Startseite eine Ferien-Meldung statt des Countdowns.

Die **gesetzlichen Feiertage in Niedersachsen** sind bereits fest hinterlegt und
müssen nicht eingetragen werden.

### Passwort ändern

Ganz unten im Tab. Du brauchst dein bisheriges Passwort. Für das neue gibt es
**keine Vorgabe zur Länge** — wähle trotzdem etwas, das nicht zu erraten ist.

Nach dem Ändern bleibst du auf diesem Gerät angemeldet — **alle anderen Geräte
werden abgemeldet**. Das ist Absicht: Wenn ein Passwort in falsche Hände geraten
ist, soll niemand über ein offenes Fenster angemeldet bleiben.

> Ändere das Passwort auf jeden Fall einmal, wenn du den Adminbereich
> übernimmst. Das Passwort aus der Ersteinrichtung ist oft mehreren Leuten
> bekannt.

### Tagesmeldungen

Kurze Sprüche, die auf der Startseite je nach Tageszeit erscheinen. Das Feld
erwartet JSON — Aufbau und Beispiele stehen in
[docs/CONTENT_FORMATS.md](CONTENT_FORMATS.md). Wenn du hier nichts brauchst,
lass einfach `{}` stehen.

Beim Speichern wird geprüft, ob das JSON gültig ist — bei einem Tippfehler
bekommst du eine Meldung, statt dass die Startseite kaputtgeht.

---

## Häufige Probleme und Lösungen

### „Ungültige Anmeldedaten"

- Prüfe, ob der Benutzername stimmt (Standard: `Admin`)
- Prüfe das Passwort (Groß-/Kleinschreibung beachten)
- Falls das System gerade erst eingerichtet wurde: frage die IT-Betreuung nach dem aktuellen Passwort

Steht über dem Anmeldeformular ein **gelber Hinweis**, liegt es nicht am Passwort,
sondern an der Einrichtung — der Hinweis sagt, was fehlt. Gib ihn genau so an die
IT-Betreuung weiter.

### „Im PDF wurde kein Stundenplan erkannt"

Diese Meldung kommt direkt nach dem Auswählen der Datei, noch vor dem Hochladen.

- Stelle sicher, dass es sich wirklich um eine PDF-Datei handelt (kein Foto, kein Scan)
- Die PDF muss echten Text enthalten. Ein eingescanntes Blatt ist nur ein Bild und kann nicht gelesen werden.
- Versuche, die PDF neu zu exportieren (aus dem Programm, das den Stundenplan erstellt)

Mehrere Seiten sind kein Problem — alle Seiten werden ausgewertet und zusammengeführt.

Steht in der Vorschau der Hinweis, das PDF enthalte **keine gezeichnete
Tabelle**, wurde der Plan nur anhand der Lage der Texte geschätzt. Er stimmt
dann meistens, aber nicht sicher — sieh ihn in dem Fall besonders genau durch.

### Die Vorschau meldet etwas zum Prüfen

Findet die Auswertung eine Stelle, bei der sie sich nicht sicher ist, steht das als
gelber Kasten in der Vorschau — zum Beispiel, wenn für eine Klasse kein einziger
Raum erkannt wurde oder ein Wochentag fehlt. Der Plan lässt sich trotzdem
hochladen; sieh die genannte Klasse vorher in der Vorschau durch.

### Die Vorschau zeigt zu wenige oder falsche Klassen

Klappe in der Vorschau die betroffene Klasse auf — dort steht Stunde für Stunde,
was aus dem PDF gelesen wurde. Stimmt das nicht, lade den Plan **nicht** hoch,
sondern klicke auf **Verwerfen** und gib der IT-Betreuung Bescheid — am besten
zusammen mit der PDF-Datei.

### Änderungen sind nicht sichtbar

- Wurde der neue Stundenplan wirklich **aktiviert**? (Status muss „Aktiv" sein)
- Lade die Seite im Browser neu (am besten mit **Strg + Umschalt + R** bzw. **Cmd + Umschalt + R** auf dem Mac)
- Auf Handys: App kurz schließen und neu öffnen

### Passwort vergessen

Dafür gibt es bewusst keinen Selbstbedienungsweg (kein Mailversand, keine
Sicherheitsfragen). Die IT-Betreuung setzt das Konto zurück:

```bash
# Konto löschen — die Stundenpläne und Ankündigungen bleiben erhalten
npx wrangler d1 execute hgh-app-db --remote \
  --command "DELETE FROM users WHERE username = 'Admin'"
```

Danach ist die Ersteinrichtung wieder aktiv: Der nächste Login mit dem
Benutzernamen aus `ADMIN_USER` (Standard `Admin`) und dem Standardpasswort
`admin` legt das Konto neu an.

**Melde dich unmittelbar nach dem Löschen an.** In der Zeit dazwischen steht der
Adminbereich offen: Wer den Benutzernamen kennt, kann sich das Konto nehmen. Der
Adminbereich lässt nach dieser Anmeldung ohnehin nichts anderes zu, als ein
Passwort zu vergeben — erst danach sind Stundenplan und Ankündigungen
wieder erreichbar.

### Sitzung abgelaufen

- Nach 12 Stunden wirst du automatisch abgemeldet
- Melde dich einfach erneut an — deine Daten gehen nicht verloren

### Ankündigung wird nicht angezeigt

- Prüfe das **Startdatum**: Liegt es in der Zukunft, wird die Ankündigung noch nicht angezeigt
- Prüfe das **Ablaufdatum**: Ist es bereits abgelaufen, wird die Ankündigung nicht mehr angezeigt
- Prüfe das Feld **Klassen**: Wenn dort Klassen eingetragen sind, sehen nur Nutzer mit diesen Klassen die Ankündigung

---

## Wenn du gar nicht weiterkommst

1. Mache einen **Screenshot** von der Fehlermeldung oder dem Problem.
2. Notiere, **was du direkt davor gemacht hast** (z. B. „Ich habe eine PDF hochgeladen und dann auf Aktivieren geklickt").
3. Gib diese Infos an die **IT-Betreuung** weiter.

So kann das Problem meist schnell gefunden und gelöst werden.
