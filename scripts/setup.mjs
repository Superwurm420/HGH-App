#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

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

const devVarsPath = path.resolve('.dev.vars');
if (!fs.existsSync(devVarsPath)) {
  fs.writeFileSync(devVarsPath, 'ADMIN_PASSWORD=admin123\n', 'utf8');
  logInfo('.dev.vars wurde erstellt (lokales Passwort: admin123).');
} else {
  logInfo('.dev.vars existiert bereits.');
}

logInfo('Lokales Setup abgeschlossen.');
console.log('\nNächste Schritte (lokale Entwicklung):');
console.log('  1) npm run dev:api');
console.log('  2) npm run dev');
console.log('  3) Browser öffnen: http://localhost:3000');

logWarn('Cloudflare-Infrastruktur (D1/R2/Secrets) wird nicht mehr automatisch lokal angelegt.');
console.log('Für Erst-Einrichtung bitte einmalig (z. B. in CI/Linux) ausführen:');
console.log('  - npx wrangler login');
console.log('  - npx wrangler d1 create hgh-app-db');
console.log('  - npx wrangler r2 bucket create hgh-app-content');
console.log('  - npx wrangler secret put ADMIN_PASSWORD -c worker/wrangler.toml');
console.log('  - npm run db:migrate');
