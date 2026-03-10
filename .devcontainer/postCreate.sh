#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────
# HGH-App — Codespace / DevContainer Setup
# Richtet die lokale Entwicklungsumgebung ein,
# OHNE Cloudflare-Login oder Remote-Ressourcen.
# ──────────────────────────────────────────────────────────
set -euo pipefail

GREEN='\033[0;32m'
BOLD='\033[1m'
NC='\033[0m'

info() { echo -e "${GREEN}✓${NC} $1"; }
step() { echo -e "\n${BOLD}── $1 ──${NC}"; }

# ── Abhängigkeiten installieren ────────────────────────────
step "Abhängigkeiten installieren"

npm install
info "Abhängigkeiten installiert"

# ── Lokale Umgebungsvariablen ──────────────────────────────
step "Lokale Umgebungsvariablen vorbereiten"

if [ ! -f ".dev.vars" ]; then
  SESSION_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
  cat > .dev.vars <<EOF
ADMIN_PASSWORD=admin123
SESSION_SECRET=$SESSION_SECRET
EOF
  info ".dev.vars erstellt (Admin-Passwort: admin123)"
else
  info ".dev.vars existiert bereits"
fi

# ── Lokale D1-Datenbank vorbereiten ────────────────────────
step "Lokale Datenbank vorbereiten"

npx wrangler d1 migrations apply hgh-app-db --local 2>&1 || {
  echo "  Hinweis: Lokale Migration fehlgeschlagen — wird beim ersten 'npm run dev:worker' erneut versucht."
}
info "Lokale Datenbank bereit"

# ── Fertig ─────────────────────────────────────────────────
step "Fertig!"

echo ""
echo -e "  ${GREEN}Die HGH-App ist bereit zur lokalen Entwicklung!${NC}"
echo ""
echo "  Starte die App mit:"
echo ""
echo -e "  ${BOLD}npm run dev:worker${NC}    (Backend — Terminal 1)"
echo -e "  ${BOLD}npm run dev${NC}           (Frontend — Terminal 2)"
echo ""
echo "  Dann öffne den Frontend-Port (3000) im Browser."
echo ""
echo -e "  ${BOLD}Admin-Login:${NC}"
echo "    Benutzername: redaktion"
echo "    Passwort:     admin123"
echo ""
