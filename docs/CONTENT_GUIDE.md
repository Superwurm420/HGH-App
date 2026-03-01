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

1. In `src/lib/admin/auth.ts` den Wert `ADMIN_PASSWORD` setzen.
2. App neu starten bzw. neu deployen.
3. `/admin` öffnen und mit dem Passwort anmelden.

> Hinweis: Das Login ist bewusst einfach gehalten und dient nur als Zugangshürde.

### Schritt-für-Schritt: neuen Beitrag erstellen

![Screenshot Adminbereich](browser:/tmp/codex_browser_invocations/6b00fb57a87b4048/artifacts/artifacts/admin-editor-v2.png)

1. `/admin` öffnen.
2. Formular ausfüllen:
   - Pflicht: `title` und `date`
   - `Start` und `Ablauf` per Kalender + Uhrzeit-Auswahl
   - `Zielgruppe` per Dropdown
   - `Sondertermin` per Schalter
   - Text im Feld `body`
3. Live-Validierung beobachten:
   - Fehler blockieren das Speichern
   - Hinweise zeigen Verbesserungen an
4. „Neuer Termin speichern“ klicken.
5. Der Eintrag landet als `.txt` in `public/content/announcements/`.
6. Bestehende Termine können aus der rechten Liste geladen, aktualisiert oder gelöscht werden.

### Feldregeln (wie im Parser/Validator)
- `title`: Pflichtfeld
- `date`: Pflichtfeld im Format `TT.MM.JJJJ HH:mm`
- `expires`: optional im Format `TT.MM.JJJJ HH:mm`
- `body`: optional, aber empfohlen
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
