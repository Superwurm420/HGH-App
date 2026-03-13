#!/usr/bin/env bash
set -euo pipefail

echo "setup.sh ist veraltet. Nutze stattdessen den zentralen Einstieg über Node."
node scripts/setup.mjs --cloudflare
