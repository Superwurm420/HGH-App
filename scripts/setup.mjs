#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const color = {
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
  reset: '\x1b[0m',
};

const status = {
  done: 'erledigt',
  open: 'offen',
};

function logInfo(message) {
  console.log(`${color.green}✓${color.reset} ${message}`);
}

function logWarn(message) {
  console.log(`${color.yellow}⚠${color.reset} ${message}`);
}

function logError(message) {
  console.log(`${color.red}✗${color.reset} ${message}`);
}

function logStep(message) {
  console.log(`\n${color.bold}${color.cyan}── ${message} ──${color.reset}`);
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    stdio: options.capture ? ['inherit', 'pipe', 'pipe'] : 'inherit',
    encoding: 'utf8',
    shell: process.platform === 'win32',
  });

  if (options.capture) {
    return {
      ok: result.status === 0,
      status: result.status,
      stdout: result.stdout ?? '',
      stderr: result.stderr ?? '',
      output: `${result.stdout ?? ''}${result.stderr ?? ''}`,
    };
  }

  return {
    ok: result.status === 0,
    status: result.status,
  };
}

function hasArg(flag) {
  return process.argv.slice(2).includes(flag);
}

function printUsage() {
  console.log('Nutzung: npm run setup:init -- --local | --cloudflare');
}

function ensureNodeVersion() {
  const major = Number.parseInt(process.versions.node.split('.')[0] ?? '0', 10);
  if (major < 20) {
    logError('Node.js 20+ ist erforderlich.');
    process.exit(1);
  }
}

function ensureDevVars() {
  const devVarsPath = path.resolve('worker', '.dev.vars');
  if (!fs.existsSync(devVarsPath)) {
    fs.writeFileSync(devVarsPath, 'ADMIN_PASSWORD=admin123\n', 'utf8');
    logInfo('worker/.dev.vars wurde erstellt (lokales Passwort: admin123).');
  } else {
    logInfo('worker/.dev.vars existiert bereits.');
  }
}

function localSetup() {
  const checklist = {
    db: status.open,
    bucket: 'nicht benötigt (lokal)',
    secret: status.done,
    migration: status.open,
  };

  logStep('Lokales Setup');
  ensureDevVars();

  logInfo('Lokale Datenbank wird vorbereitet...');
  const migration = run('npx', ['wrangler', 'd1', 'migrations', 'apply', 'hgh-app-db', '--local', '-c', 'worker/wrangler.toml']);
  if (migration.ok) {
    checklist.db = status.done;
    checklist.migration = status.done;
    logInfo('Lokale Datenbank-Migration erfolgreich.');
  } else {
    checklist.db = status.open;
    checklist.migration = status.open;
    logWarn('Lokale Migration fehlgeschlagen. Führe "npm run db:migrate:local" manuell aus.');
  }

  return checklist;
}

function readWranglerToml() {
  const wranglerPath = path.resolve('worker', 'wrangler.toml');
  return {
    wranglerPath,
    content: fs.readFileSync(wranglerPath, 'utf8'),
  };
}

function parseDatabaseId(content) {
  const match = content.match(/database_id\s*=\s*"([^"]+)"/);
  return match?.[1] ?? null;
}

function upsertDatabaseId(content, databaseId) {
  return content.replace(/database_id\s*=\s*"([^"]+)"/, `database_id = "${databaseId}"`);
}

function cloudflareSetup() {
  const checklist = {
    db: status.open,
    bucket: status.open,
    secret: status.open,
    migration: status.open,
  };

  logStep('Cloudflare Voraussetzungen prüfen');
  const whoami = run('npx', ['wrangler', 'whoami'], { capture: true });
  if (!whoami.ok) {
    logWarn('Du bist nicht bei Cloudflare angemeldet. Starte Login...');
    const login = run('npx', ['wrangler', 'login']);
    if (!login.ok) {
      logError('Cloudflare-Login fehlgeschlagen.');
      return checklist;
    }
  }
  logInfo('Bei Cloudflare angemeldet.');

  logStep('D1 Datenbank sicherstellen');
  const { wranglerPath, content } = readWranglerToml();
  const currentDbId = parseDatabaseId(content);

  if (currentDbId && currentDbId !== 'placeholder-replace-after-creation') {
    checklist.db = status.done;
    logInfo(`Datenbank-ID bereits in worker/wrangler.toml eingetragen (${currentDbId}).`);
  } else {
    const createDb = run('npx', ['wrangler', 'd1', 'create', 'hgh-app-db'], { capture: true });
    const output = createDb.output;
    const idMatch = output.match(/database_id\s*=\s*"([^"]+)"/);
    const createdDbId = idMatch?.[1];

    if (createdDbId) {
      const updated = upsertDatabaseId(content, createdDbId);
      fs.writeFileSync(wranglerPath, updated, 'utf8');
      checklist.db = status.done;
      logInfo(`Datenbank erstellt und worker/wrangler.toml aktualisiert (${createdDbId}).`);
    } else if (/already exists/i.test(output)) {
      logWarn('Datenbank existiert bereits, aber keine database_id wurde automatisch gefunden.');
      logWarn('Bitte Datenbank-ID mit "npx wrangler d1 list" ermitteln und in worker/wrangler.toml setzen.');
    } else {
      logError('Datenbank konnte nicht erstellt werden.');
      if (output.trim()) {
        console.log(output.trim());
      }
    }
  }

  logStep('R2 Bucket sicherstellen');
  const bucket = run('npx', ['wrangler', 'r2', 'bucket', 'create', 'hgh-app-content'], { capture: true });
  const bucketOutput = bucket.output;
  if (bucket.ok || /already exists/i.test(bucketOutput)) {
    checklist.bucket = status.done;
    logInfo('R2-Bucket hgh-app-content ist verfügbar.');
  } else {
    logWarn('R2-Bucket konnte nicht sicher bestätigt werden.');
    if (bucketOutput.trim()) {
      console.log(bucketOutput.trim());
    }
  }

  logStep('Admin Secret setzen');
  logInfo('Falls bereits vorhanden, kann Secret einfach überschrieben werden.');
  const secret = run('npx', ['wrangler', 'secret', 'put', 'ADMIN_PASSWORD', '-c', 'worker/wrangler.toml']);
  if (secret.ok) {
    checklist.secret = status.done;
    logInfo('Secret ADMIN_PASSWORD gesetzt.');
  } else {
    logWarn('Secret konnte nicht gesetzt werden.');
  }

  logStep('Migration ausführen');
  const migration = run('npx', ['wrangler', 'd1', 'migrations', 'apply', 'hgh-app-db', '-c', 'worker/wrangler.toml']);
  if (migration.ok) {
    checklist.migration = status.done;
    if (checklist.db === status.open) {
      checklist.db = status.done;
    }
    logInfo('Migration erfolgreich ausgeführt.');
  } else {
    logWarn('Migration fehlgeschlagen. Führe "npm run db:migrate" manuell aus.');
  }

  return checklist;
}

function printChecklist(checklist) {
  console.log(`\n${color.bold}Checkliste${color.reset}`);
  console.log(`- DB: ${checklist.db}`);
  console.log(`- Bucket: ${checklist.bucket}`);
  console.log(`- Secret: ${checklist.secret}`);
  console.log(`- Migration: ${checklist.migration}`);
}

ensureNodeVersion();

const local = hasArg('--local');
const cloudflare = hasArg('--cloudflare');

if (local === cloudflare) {
  printUsage();
  process.exit(1);
}

if (local) {
  const checklist = localSetup();
  printChecklist(checklist);
  process.exit(0);
}

const checklist = cloudflareSetup();
printChecklist(checklist);
process.exit(0);
