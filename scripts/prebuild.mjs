#!/usr/bin/env node
/**
 * Erzeugt die generierten Dateien in public/ vor jedem Build und vor `next dev`.
 *
 * Beides sind Build-Artefakte und stehen deshalb in .gitignore — sie werden aus
 * scripts/sw.template.js bzw. aus node_modules erzeugt.
 */
import fs from 'node:fs';
import path from 'node:path';

/**
 * 1. Service Worker mit frischer Build-Version.
 *
 * Der Cache-Name enthält diese Version. Bleibt sie über Builds hinweg gleich,
 * behalten installierte Geräte ihren alten Cache und sehen die neue Version
 * nie — genau das war hier über Monate der Fall, weil das erzeugende Skript
 * irgendwann verloren ging und die Version auf März eingefroren blieb.
 */
const templatePath = path.resolve('scripts', 'sw.template.js');
const swPath = path.resolve('public', 'sw.js');
const version = new Date().toISOString().replace(/[:.]/g, '-');

const template = fs.readFileSync(templatePath, 'utf8');
if (!template.includes('__BUILD_VERSION__')) {
  console.error('[prebuild] Platzhalter __BUILD_VERSION__ fehlt in scripts/sw.template.js.');
  process.exit(1);
}

fs.writeFileSync(swPath, template.replaceAll('__BUILD_VERSION__', version), 'utf8');
console.log(`[prebuild] public/sw.js erzeugt (Version ${version}).`);

/**
 * 2. pdfjs als statische Dateien nach public/pdfjs/ kopieren.
 *
 * Der Stundenplan wird im Browser des Admins geparst. pdfjs wird dabei bewusst
 * NICHT mitgebündelt, sondern zur Laufzeit von hier geladen: Die Bibliothek ist
 * rund 1,5 MB groß, wird nur beim Hochladen eines PDFs gebraucht und würde
 * sonst sowohl das Worker-Bundle als auch den Download für alle Schülerinnen
 * und Schüler unnötig aufblähen.
 */
const pdfjsDir = path.resolve('public', 'pdfjs');
fs.mkdirSync(pdfjsDir, { recursive: true });

for (const file of ['pdf.min.mjs', 'pdf.worker.min.mjs']) {
  const source = path.resolve('node_modules', 'pdfjs-dist', 'legacy', 'build', file);

  if (!fs.existsSync(source)) {
    console.error(`[prebuild] pdfjs-Datei nicht gefunden: ${source}`);
    console.error('[prebuild] Wurde "npm install" ausgeführt?');
    process.exit(1);
  }

  fs.copyFileSync(source, path.join(pdfjsDir, file));
}

console.log('[prebuild] public/pdfjs/ aktualisiert (pdf.min.mjs, pdf.worker.min.mjs).');
