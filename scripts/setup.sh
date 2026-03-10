#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────
# HGH-App — Einrichtungsskript
# Richtet alles Nötige auf Cloudflare ein (D1, R2, Secrets)
# und bereitet die lokale Entwicklung vor.
# ──────────────────────────────────────────────────────────
set -euo pipefail

# Farben
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BOLD='\033[1m'
NC='\033[0m' # No Color

info()  { echo -e "${GREEN}✓${NC} $1"; }
warn()  { echo -e "${YELLOW}⚠${NC} $1"; }
error() { echo -e "${RED}✗${NC} $1"; }
step()  { echo -e "\n${BOLD}── $1 ──${NC}"; }

# ── Voraussetzungen prüfen ─────────────────────────────────
step "Voraussetzungen prüfen"

if ! command -v node &> /dev/null; then
  error "Node.js ist nicht installiert. Bitte installiere es von https://nodejs.org"
  exit 1
fi
info "Node.js $(node --version) gefunden"

if ! command -v npx &> /dev/null; then
  error "npx nicht gefunden. Wird mit Node.js installiert."
  exit 1
fi

# ── Abhängigkeiten installieren ────────────────────────────
step "Abhängigkeiten installieren"

if [ ! -d "node_modules" ]; then
  npm install
  info "Abhängigkeiten installiert"
else
  info "Abhängigkeiten bereits vorhanden"
fi

# ── Wrangler-Login prüfen ─────────────────────────────────
step "Cloudflare-Anmeldung prüfen"

if ! npx wrangler whoami &> /dev/null; then
  warn "Du bist nicht bei Cloudflare angemeldet."
  echo "    Dein Browser öffnet sich jetzt — melde dich dort an."
  npx wrangler login
fi
info "Bei Cloudflare angemeldet"

# ── D1-Datenbank erstellen ─────────────────────────────────
step "Datenbank erstellen (D1)"

WRANGLER_TOML="worker/wrangler.toml"
CURRENT_DB_ID=$(grep 'database_id' "$WRANGLER_TOML" | head -1 | sed 's/.*= *"\(.*\)"/\1/')

if [ "$CURRENT_DB_ID" = "placeholder-replace-after-creation" ]; then
  echo "    Erstelle D1-Datenbank 'hgh-app-db'..."
  DB_OUTPUT=$(npx wrangler d1 create hgh-app-db 2>&1) || true

  # Datenbank-ID aus der Ausgabe extrahieren
  DB_ID=$(echo "$DB_OUTPUT" | grep 'database_id' | sed 's/.*= *"\(.*\)"/\1/')

  if [ -n "$DB_ID" ]; then
    # ID in wrangler.toml eintragen
    sed -i "s/placeholder-replace-after-creation/$DB_ID/" "$WRANGLER_TOML"
    info "Datenbank erstellt (ID: $DB_ID)"
    info "wrangler.toml automatisch aktualisiert"
  else
    # Vielleicht existiert die DB schon
    if echo "$DB_OUTPUT" | grep -qi "already exists"; then
      warn "Datenbank 'hgh-app-db' existiert bereits."
      echo "    Bitte trage die database_id manuell in wrangler.toml ein."
      echo "    Du findest sie mit: npx wrangler d1 list"
    else
      error "Konnte Datenbank nicht erstellen. Ausgabe:"
      echo "$DB_OUTPUT"
      exit 1
    fi
  fi
else
  info "Datenbank-ID bereits in wrangler.toml eingetragen ($CURRENT_DB_ID)"
fi

# ── R2-Bucket erstellen ───────────────────────────────────
step "Dateispeicher erstellen (R2)"

R2_OUTPUT=$(npx wrangler r2 bucket create hgh-app-content 2>&1) || true

if echo "$R2_OUTPUT" | grep -qi "already exists"; then
  info "R2-Bucket 'hgh-app-content' existiert bereits"
elif echo "$R2_OUTPUT" | grep -qi "created"; then
  info "R2-Bucket 'hgh-app-content' erstellt"
else
  warn "R2-Bucket Status unklar. Ausgabe: $R2_OUTPUT"
fi

# ── Datenbank-Migration ausführen ──────────────────────────
step "Datenbank-Tabellen erstellen"

echo "    Migration wird auf Cloudflare ausgeführt..."
npx wrangler d1 migrations apply hgh-app-db --remote -c worker/wrangler.toml 2>&1 || {
  warn "Remote-Migration fehlgeschlagen — wird bei 'npm run db:migrate' erneut versucht."
}
info "Tabellen erstellt"

# ── Admin-Passwort setzen ─────────────────────────────────
step "Admin-Passwort setzen"

# ADMIN_PASSWORD vom Benutzer abfragen
echo ""
echo -e "    ${BOLD}Jetzt brauchst du ein Admin-Passwort.${NC}"
echo "    Damit loggst du dich später im Adminbereich ein."
echo "    (Benutzername ist: redaktion)"
echo ""
read -sp "    Admin-Passwort eingeben: " ADMIN_PW
echo ""

if [ -z "$ADMIN_PW" ]; then
  error "Kein Passwort eingegeben. Setze es später manuell mit:"
  echo "    npx wrangler secret put ADMIN_PASSWORD"
else
  echo "$ADMIN_PW" | npx wrangler secret put ADMIN_PASSWORD -c worker/wrangler.toml 2>&1 || {
    warn "ADMIN_PASSWORD konnte nicht gesetzt werden. Setze es manuell mit:"
    echo "    npx wrangler secret put ADMIN_PASSWORD"
  }
  info "ADMIN_PASSWORD gesetzt"
fi

# ── Lokale Entwicklung vorbereiten ─────────────────────────
step "Lokale Entwicklung vorbereiten"

if [ ! -f ".dev.vars" ]; then
  cat > .dev.vars <<EOF
ADMIN_PASSWORD=admin123
EOF
  info ".dev.vars erstellt (lokales Passwort: admin123)"
else
  info ".dev.vars existiert bereits"
fi

echo "    Lokale Datenbank-Migration..."
npx wrangler d1 migrations apply hgh-app-db --local -c worker/wrangler.toml 2>&1 || {
  warn "Lokale Migration fehlgeschlagen."
}
info "Lokale Datenbank bereit"

# ── Zusammenfassung ────────────────────────────────────────
step "Fertig!"

echo ""
echo -e "  ${GREEN}Die HGH-App ist eingerichtet!${NC}"
echo ""
echo "  Was du jetzt tun kannst:"
echo ""
echo -e "  ${BOLD}App auf Cloudflare veröffentlichen:${NC}"
echo "    npm run deploy"
echo ""
echo -e "  ${BOLD}Lokal entwickeln:${NC}"
echo "    npm run dev:api       (Terminal 1 — Backend-API)"
echo "    npm run dev           (Terminal 2 — Frontend)"
echo "    Dann öffne: http://localhost:3000"
echo ""
echo -e "  ${BOLD}Admin-Login:${NC}"
echo "    Öffne /admin und melde dich an mit:"
echo "    Benutzername: redaktion"
echo "    Passwort:     (das eben gesetzte Passwort)"
echo "    Lokal:        admin123"
echo ""
