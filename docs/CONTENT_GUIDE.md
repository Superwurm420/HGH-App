# Inhaltspflege – Schnellanleitung für Mitwirkende

Diese Anleitung ist für Personen gedacht, die Inhalte tauschen möchten, ohne Code zu schreiben.

## 1) Stundenplan aktualisieren

### Schritt für Schritt
1. PDF in `public/content/timetables/` ablegen.
2. Commit + Push nach GitHub.
3. Vercel baut automatisch neu – fertig.

### Dateiname
**Empfohlen:** `Stundenplan_kw_XX_HjY_YYYY_YY.pdf`

Beispiel: `Stundenplan_kw_09_Hj2_2025_26.pdf`
- `XX` = Kalenderwoche (01–53)
- `Y` = Halbjahr (1 oder 2)
- `YYYY_YY` = Schuljahr (z.B. 2025_26)

**Fallback:** Wenn der Name anders ist (z.B. `Vertretungsplan_2025.pdf`), wird die Datei trotzdem erkannt, solange eine Jahreszahl im Namen steht. Die App gibt eine Warnung aus, funktioniert aber.

### Was passiert automatisch?
- Die App erkennt die neueste PDF anhand des Dateinamens
- Klassen (HT11, G21, etc.) werden **automatisch** aus dem PDF erkannt
- Alte PDFs dürfen liegen bleiben (werden als Archiv behalten)
- Nutzer können jederzeit die Original-PDF öffnen (Button "PDF-Stundenplan")

## 2) Pinnwand über Admin-Seite pflegen (`/admin`)

### Zugang einrichten (einmalig)

#### Lokal testen
1. `.env.local` anlegen (Vorlage: `.env.example`).
2. Werte setzen:
   - `ADMIN_USER=redaktion`
   - `ADMIN_PASSWORD=<dein-sicheres-passwort>`
3. `npm run dev` neu starten.
4. `/admin` öffnen und mit den Daten anmelden.

#### Produktion (Vercel)
1. In Vercel: **Project → Settings → Environment Variables**.
2. `ADMIN_USER` und `ADMIN_PASSWORD` eintragen.
3. Neu deployen.
4. `/admin` aufrufen und Browser-Anmeldedialog mit den Zugangsdaten ausfüllen.

### Schritt-für-Schritt: neuen Beitrag erstellen

![Screenshot Adminbereich](browser:/tmp/codex_browser_invocations/6b00fb57a87b4048/artifacts/artifacts/admin-editor-v2.png)

1. `/admin` öffnen.
2. Vereinfachtes Formular ausfüllen:
   - Pflicht: `title`
   - `Start` und `Ablauf` bequem per Kalender + Uhrzeit-Auswahl
   - `Zielgruppe` per Dropdown
   - `Sondertermin` per einfachem Schalter (anstatt Textwert `anzeige`)
   - Text im Feld `body`
3. Live-Validierung beobachten:
   - Fehler blockieren „Auf Server speichern“
   - Warnungen zeigen sofort, was später ignoriert wird
4. „Auf Server speichern“ klicken.
5. Die Datei landet als `.txt` in `public/content/announcements/`.

### Export/Import (kompatibel zum bestehenden TXT-Betrieb)
- **TXT exportieren:** erstellt eine klassische `.txt`-Datei im bestehenden Header+`---`+Body-Format.
- **TXT importieren:** vorhandene TXT-Dateien per Datei-Upload oder Einfügen laden, bearbeiten und wieder speichern.
- Damit bleibt der gesamte bisherige Content-Workflow kompatibel.

### Feldregeln (wie im Parser/Validator)
- `title`: Pflichtfeld
- `date`: wird intern im TXT-Format `TT.MM.JJJJ HH:mm` gespeichert
- `expires`: wird intern im TXT-Format `TT.MM.JJJJ HH:mm` gespeichert
- `body`: sollte Text enthalten
- Schalter „Sondertermin anzeigen“ setzt intern `anzeige: ja/nein`

> Hinweis: Das alte TXT-Format bleibt vollständig kompatibel (Import/Export), aber der empfohlene Workflow ist jetzt der Adminbereich.

## 3) Branding austauschen
1. Logos/Bilder in `public/content/branding/` ersetzen.
2. Dateinamen möglichst stabil halten.
3. Root-URLs (`/favicon.ico`, `/apple-touch-icon.png`, ...) werden automatisch auf diesen Ordner umgeleitet.
4. Commit + Push.

## 4) Vor dem Push lokal prüfen (optional)
```bash
npm run validate-content        # Prüft Dateinamen + TXT-Format
npm run select-latest-timetable # Zeigt welche PDF als neueste erkannt wird
npm run prebuild                # Volles Parsen mit Diagnose-Ausgabe
```

## 5) Verhalten in der App
- Nutzer können jederzeit die Original-PDF öffnen (Button "PDF-Stundenplan").
- Bei fehlerhaften TXT-Daten: Warnung, soweit möglich trotzdem Anzeige.
- Die Klassenliste passt sich automatisch an die PDF an (neue Klassen erscheinen sofort).
