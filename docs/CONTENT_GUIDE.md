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

### Prüfen ob es funktioniert hat
Nach dem Push zeigt das Vercel Build-Log:
```
═══ Stundenplan-PDFs ═══
  5 PDF(s) gefunden: ...
  Neueste nach Sortierung: Stundenplan_kw_09_Hj2_2025_26.pdf
  Parsing Stundenplan_kw_09_Hj2_2025_26.pdf...
    Klassen: HT11, HT12, HT21, HT22, G11, G12, GT01
    Stunden gesamt: 142
```

Wenn eine Klasse `0 Stunden` hat oder `Keine Klassen erkannt` erscheint, stimmt etwas mit der PDF-Struktur nicht.

## 2) Pinnwand aktualisieren
1. Neue `.txt` in `public/content/announcements/` anlegen.
2. Vorlage aus `docs/templates/announcement-template.txt` verwenden.
3. Formatfelder ausfüllen (`title`, `date`; optional `audience`, `classes`, `expires`, `highlight`).
4. Commit + Push.


### Einheitliches Termin-System (neu)
- Für **normale Pinnwand-Beiträge** und **dringende Sondertermine** wird dieselbe TXT-Struktur genutzt.
- Über `classes` steuerst du, **welche Klassen den Beitrag überhaupt sehen**.
- Entscheidung über Sichtbarkeit vor dem Stundenplan nur über ein Feld:
  - `highlight: true` (oder `ja`/`1`) => zusätzlich hervorgehoben beim Stundenplan
  - `highlight: false` (oder `nein`/`0`, Standard) => nur Pinnwand
- `audience` bleibt ein erklärender Text, die technische Sichtbarkeit kommt über `classes`.
- Kommentare im Header sind erlaubt (`#`, `//`, `;`), damit Vorlagen direkt erklärt werden können.

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
