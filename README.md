# HGH-App – einfach erklärt

Die **HGH-App** zeigt Schülerinnen und Schülern:
- den aktuellen Stundenplan,
- Ankündigungen,
- Termine,
- und Tagesmeldungen.

Diese Datei ist bewusst für **Nicht-Techniker** geschrieben.

---

## 1) Schnellstart (empfohlen)

Wenn du die App neu einrichtest, brauchst du nur drei Schritte.

### Voraussetzungen
- **Node.js ab Version 20** (Download: https://nodejs.org)
- **Cloudflare-Konto** (kostenlos): https://dash.cloudflare.com

### Schritte

```bash
git clone <repository-url>
cd HGH-App
npm run setup
npm run deploy
```

Danach:
- App öffnen
- auf `/admin` gehen
- mit diesen Daten anmelden:
  - Benutzername: `redaktion`
  - Passwort: das Passwort aus dem Setup

---

## 2) Was macht `npm run setup` genau?

Das Setup erledigt automatisch:
1. notwendige Pakete installieren,
2. Cloudflare-Login vorbereiten,
3. Datenbank einrichten,
4. Speicher für Upload-Dateien anlegen,
5. Admin-Passwort abfragen,
6. lokale Entwicklung vorbereiten.

Du musst das normalerweise nur **einmal** machen.

---

## 3) Wichtige Befehle (einfach erklärt)

| Befehl | Bedeutung |
|---|---|
| `npm run setup` | Ersteinrichtung (einmalig) |
| `npm run dev:api` | Lokales Backend starten |
| `npm run dev` | Lokales Frontend starten |
| `npm run deploy` | App veröffentlichen |
| `npm run lint` | Code auf typische Fehler prüfen |
| `npm run test:unit` | Automatische Tests ausführen |

---

## 4) Lokal testen (ohne Veröffentlichung)

Du brauchst **2 Terminals**:

```bash
# Terminal 1
npm run dev:api

# Terminal 2
npm run dev
```

Dann im Browser öffnen: http://localhost:3000

Lokaler Login:
- Benutzername: `redaktion`
- Passwort: `admin123`

---

## 5) Wo finde ich Hilfe?

- Für die Bedienung des Adminbereichs: **[docs/ADMIN.md](docs/ADMIN.md)**
- Für Inhalte wie `messages.json` und Ferien-Zeiträume: **[docs/CONTENT_FORMATS.md](docs/CONTENT_FORMATS.md)**

---

## 6) Technischer Hinweis (nur falls nötig)

Die App wird als zwei Worker betrieben (Web + API).
Wenn API-Aufrufe in der veröffentlichten Version nicht funktionieren, muss im Web-Worker die Variable `API_ORIGIN` auf die URL des API-Workers zeigen.

Für normale Redaktionsarbeit ist das **nicht relevant**.
