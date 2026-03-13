# Admin-Anleitung — Schritt für Schritt

Diese Anleitung erklärt dir alles, was du im Adminbereich der HGH-App tun kannst. Du brauchst dafür **keine technischen Vorkenntnisse**.

---

## Was kannst du im Adminbereich tun?

Im Adminbereich gibt es drei Hauptbereiche:

1. **Stundenplan** — PDF-Dateien mit dem aktuellen Stundenplan hochladen und freischalten
2. **Ankündigungen** — Nachrichten erstellen, die auf der Startseite und der Pinnwand erscheinen
3. **Termine** — Kalendereinträge pflegen (z. B. Klausuren, Projekte, Feiertage)

---

## Anmeldung

1. Öffne die App im Browser.
2. Hänge `/admin` an die Adresse an (z. B. `https://deine-app.de/admin`).
3. Gib deinen Benutzernamen und dein Passwort ein:
   - **Benutzername**: `redaktion` (Standardwert, kann von der IT geändert werden)
   - **Passwort**: bekommst du von der IT-Betreuung
4. Klicke auf **Anmelden**.

**Gut zu wissen:**
- Beim allerersten Login wird dein Adminkonto automatisch erstellt — du musst nichts extra einrichten.
- Deine Sitzung läuft nach **12 Stunden** automatisch ab. Danach musst du dich einfach erneut anmelden.

---

## Stundenplan verwalten

### Neuen Stundenplan hochladen

1. Wechsle zum Tab **Stundenplan**.
2. Klicke auf **Durchsuchen** und wähle die PDF-Datei aus.
3. Klicke auf **Hochladen**.
4. Warte, bis der Status sich von „Hochgeladen" über „Wird geparst" zu **Bereit zur Aktivierung** ändert.
5. Klicke auf **Aktivieren**.

**Erst nach dem Aktivieren** sehen die Nutzer den neuen Stundenplan in der App!

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
| **Hochgeladen** | Die Datei ist angekommen und wird gleich verarbeitet |
| **Wird geparst** | Die App liest gerade den Inhalt der PDF-Datei |
| **Bereit zur Aktivierung** | Alles wurde erkannt — du kannst den Plan jetzt freischalten |
| **Aktiv** | Dieser Plan wird den Nutzern aktuell angezeigt |
| **Fehler** | Die Datei konnte nicht korrekt verarbeitet werden (siehe Troubleshooting unten) |
| **Archiviert** | Ein alter Plan, der nicht mehr aktiv ist |

### Wichtige Hinweise

- **Dateigröße**: Maximal 20 MB pro PDF
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
| **Zielgruppe** | Nein | Für wen die Ankündigung gedacht ist. Auswahl: **alle**, **Schülerinnen und Schüler**, **Lehrkräfte**, **Eltern**, **Ausbildungspartner** |
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

## Termine verwalten

Wechsle zum Tab **Termine**. Die Bedienung ist ähnlich wie bei Ankündigungen.

### Neuen Termin erstellen

| Feld | Pflicht? | Erklärung |
|---|---|---|
| **Titel** | Ja | Name des Termins (z. B. „Klausur Mathematik") |
| **Startdatum** | Ja | An welchem Tag der Termin stattfindet |
| **Enddatum** | Nein | Falls der Termin über mehrere Tage geht (z. B. eine Projektwoche) |
| **Kategorie** | Nein | Art des Termins. Auswahl: **Allgemein**, **Klausur/Prüfung**, **Feiertag/Frei**, **Projekt**, **Sonstiges** |
| **Klassen** | Nein | Für welche Klassen der Termin gilt, getrennt durch Kommas (z. B. `HT11, G21`). Leer = alle Klassen. |
| **Beschreibung** | Nein | Zusätzliche Details zum Termin |

Klicke auf **Erstellen**.

### Termin bearbeiten oder löschen

Funktioniert genauso wie bei Ankündigungen:
- **Bearbeiten**: Auf den Titel rechts klicken → Formular anpassen → **Aktualisieren**
- **Löschen**: Roten **Löschen**-Button klicken → Bestätigen

---

## Häufige Probleme und Lösungen

### „Ungültige Anmeldedaten"

- Prüfe, ob der Benutzername stimmt (Standard: `redaktion`)
- Prüfe das Passwort (Groß-/Kleinschreibung beachten)
- Falls das System gerade erst eingerichtet wurde: frage die IT-Betreuung nach dem aktuellen Passwort

### Upload steht auf „Fehler"

- Stelle sicher, dass es sich wirklich um eine PDF-Datei handelt
- Prüfe, ob die Datei nicht größer als 20 MB ist
- Versuche, die PDF neu zu exportieren (z. B. aus dem Programm, das den Stundenplan erstellt) und lade sie erneut hoch
- Falls der Fehler bestehen bleibt: die PDF hat möglicherweise ein ungewöhnliches Format, das die App nicht verarbeiten kann

### Änderungen sind nicht sichtbar

- Wurde der neue Stundenplan wirklich **aktiviert**? (Status muss „Aktiv" sein)
- Lade die Seite im Browser neu (am besten mit **Strg + Umschalt + R** bzw. **Cmd + Umschalt + R** auf dem Mac)
- Auf Handys: App kurz schließen und neu öffnen

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
