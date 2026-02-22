# HGH-App – Schulstundenplan als PWA

Dieses Repository enthält das **Projektfundament** für eine einfache, installierbare Stundenplan-App (PWA) für Schüler:innen.

## Ziele
- Klassenbezogene Stundenplanansicht
- Sondertermine als Abweichungen vom Standardtag
- Einfache Inhaltsaktualisierung über Dateien in GitHub
- Deutschsprachige Oberfläche
- "Original-PDF anzeigen" als Fallback für volle Transparenz

## Inhalt des Repos
- `docs/PROJEKTIDEE.md` – Produktgedanke, Ziele, Nicht-Ziele
- `docs/ARCHITEKTUR.md` – technische Leitplanken & Datenfluss
- `docs/CONTENT_FORMATS.md` – verbindliche Dateiformate
- `docs/CONTENT_GUIDE.md` – Schritt-für-Schritt für Dateiaustausch
- `docs/PROJECT_START_CHECKLIST.md` – Start-/Qualitätscheckliste
- `templates/announcement-template.txt` – Vorlage für Pinnwandtexte
- `scripts/validate-content.mjs` – prüft Dateinamen und TXT-Formate
- `scripts/select-latest-timetable.mjs` – ermittelt die neueste Stundenplan-PDF

## Struktur für austauschbare Inhalte
```text
public/content/
  timetables/
  announcements/
  branding/
```

## Validierung verwenden
```bash
node scripts/validate-content.mjs
```

## Neueste Stundenplan-PDF ermitteln
```bash
node scripts/select-latest-timetable.mjs
```

Beide Skripte sind bewusst einfach gehalten, damit Mitwirkende schnell verstehen, was zu tun ist.
