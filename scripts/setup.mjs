#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const green = '\x1b[32m';
const yellow = '\x1b[33m';
const reset = '\x1b[0m';

function logInfo(message) {
  console.log(`${green}✓${reset} ${message}`);
}

function logWarn(message) {
  console.log(`${yellow}⚠${reset} ${message}`);
}

const major = Number.parseInt(process.versions.node.split('.')[0] ?? '0', 10);
if (major < 20) {
  console.error('Node.js 20+ ist erforderlich.');
  process.exit(1);
}

const devVarsPath = path.resolve('worker', '.dev.vars');
if (!fs.existsSync(devVarsPath)) {
  fs.writeFileSync(devVarsPath, 'ADMIN_PASSWORD=admin123\n', 'utf8');
  logInfo('worker/.dev.vars wurde erstellt (lokales Passwort: admin123).');
} else {
  logInfo('worker/.dev.vars existiert bereits.');
}

// Lokale D1-Datenbank migrieren
logInfo('Lokale Datenbank wird vorbereitet...');
try {
  execSync('npx wrangler d1 migrations apply hgh-app-db --local -c worker/wrangler.toml', {
    stdio: 'inherit',
  });
  logInfo('Lokale Datenbank-Migration erfolgreich.');
} catch {
  logWarn('Lokale Migration fehlgeschlagen. Führe "npm run db:migrate:local" manuell aus.');
}

logInfo('Lokales Setup abgeschlossen.');
console.log('\nNächste Schritte (lokale Entwicklung):');
console.log('  1) npm run dev:api');
console.log('  2) npm run dev');
console.log('  3) Browser öffnen: http://localhost:3000');
console.log('  4) Admin-Login: Benutzername "redaktion", Passwort "admin123"');

logWarn('Cloudflare-Infrastruktur (D1/R2/Secrets) wird nicht automatisch angelegt.');
console.log('Für Erst-Einrichtung auf Cloudflare bitte einmalig ausführen:');
console.log('  - npx wrangler login');
console.log('  - npx wrangler d1 create hgh-app-db');
console.log('  - npx wrangler r2 bucket create hgh-app-content');
console.log('  - npx wrangler secret put ADMIN_PASSWORD -c worker/wrangler.toml');
console.log('  - npm run db:migrate');
