# HGH-App

Die HGH-App besteht aus:
- **Next.js-Frontend** (OpenNext/Cloudflare)
- **Cloudflare Worker API** (`worker/`)

## Lokal entwickeln (Windows/macOS/Linux)

### Voraussetzungen
- Node.js 20+
- npm

### Start
```bash
npm install
npm run setup
npm run dev:api
npm run dev
```

Dann im Browser: `http://localhost:3000`

> `npm run setup` ist jetzt plattformunabhängig und bereitet nur die lokale Entwicklung vor (z. B. `.dev.vars`).

## Deploy (automatisch über GitHub Actions)

Deploy läuft **nicht mehr über lokales Windows-Deploy**, sondern automatisch:
- Trigger: Push auf `main`
- Runner: `ubuntu-latest`
- Ablauf: `npm ci` → `lint` → `test:unit` → `build` → `deploy`
- Workflow-Datei: `.github/workflows/deploy.yml`

Der Workflow führt OpenNext + Cloudflare Deploy über diese npm-Skripte aus:
- `npm run build`
- `npm run deploy`

## Erforderliche GitHub Secrets

Im GitHub-Repository unter **Settings → Secrets and variables → Actions** setzen:

- `CLOUDFLARE_API_TOKEN`
  - Cloudflare API Token mit Rechten für Workers, D1 und R2 (Deploy-Rechte)
- `CLOUDFLARE_ACCOUNT_ID`
  - Deine Cloudflare Account-ID

## Nützliche Scripts

- `npm run dev` – Next.js lokal
- `npm run dev:api` – Worker API lokal
- `npm run build` – OpenNext Build
- `npm run deploy` – OpenNext Web + API deployen (primär in CI)
- `npm run setup` – lokales, plattformunabhängiges Setup
- `npm run setup:cloudflare` – altes Linux/macOS-Einrichtungsskript (optional, nur wenn benötigt)
