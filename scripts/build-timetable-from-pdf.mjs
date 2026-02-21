import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { importTimetableFromPdfRaw } from '../src/services/timetable/pdf-import-service.js';
import { DEFAULT_TIMESLOTS } from '../src/config/app-constants.js';

const __filename = fileURLToPath(import.meta.url);
const ROOT = resolve(__filename, '..', '..');
const TIMETABLE_DIR = resolve(ROOT, 'content/timetables');
const GENERATED_TARGET = resolve(ROOT, 'content/stundenplan.generated.json');

async function loadPdfJs() {
  try {
    const mod = await import('pdfjs-dist/legacy/build/pdf.mjs');
    return mod;
  } catch (error) {
    const reason = error && error.message ? error.message : String(error);
    throw new Error(`pdfjs-dist fehlt. Bitte einmalig installieren: npm install --save-dev pdfjs-dist (Details: ${reason})`);
  }
}

function pickLatestPdfFile() {
  const pdfs = readdirSync(TIMETABLE_DIR, { withFileTypes: true })
    .filter((entry) => entry.isFile() && /\.pdf$/i.test(entry.name))
    .map((entry) => {
      const absPath = resolve(TIMETABLE_DIR, entry.name);
      return { name: entry.name, absPath, mtimeMs: statSync(absPath).mtimeMs };
    })
    .sort((a, b) => b.mtimeMs - a.mtimeMs);

  return pdfs[0] || null;
}

async function extractPdfItems(pdfPath, pdfjs) {
  const bytes = new Uint8Array(readFileSync(pdfPath));
  const loadingTask = pdfjs.getDocument({ data: bytes });
  const pdf = await loadingTask.promise;
  const extracted = [];

  for (let pageNo = 1; pageNo <= pdf.numPages; pageNo += 1) {
    const page = await pdf.getPage(pageNo);
    const viewport = page.getViewport({ scale: 1 });
    const textContent = await page.getTextContent();
    const pageOffset = pageNo * 5000;

    for (const item of textContent.items || []) {
      const transform = item?.transform || [];
      const str = (item?.str || '').toString().trim();
      if (!str) continue;

      const x = Number(transform[4]);
      const yFromBottom = Number(transform[5]);
      if (!Number.isFinite(x) || !Number.isFinite(yFromBottom)) continue;

      const y = (viewport.height - yFromBottom) + pageOffset;
      extracted.push({ str, x: Math.round(x * 100) / 100, y: Math.round(y * 100) / 100, page: pageNo });
    }
  }

  return extracted;
}

function writeJson(path, payload) {
  writeFileSync(path, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

export async function buildTimetableFromLatestPdf() {
  const latest = pickLatestPdfFile();
  if (!latest) {
    return { ok: false, reason: 'no-pdf', message: 'Keine PDF in content/timetables/ gefunden.' };
  }

  const pdfjs = await loadPdfJs();
  const items = await extractPdfItems(latest.absPath, pdfjs);
  const nowIso = new Date().toISOString();
  const rawPayload = {
    meta: {
      source: latest.name,
      updatedAt: nowIso,
      extractedWith: 'pdfjs-dist',
      itemCount: items.length,
    },
    items,
  };
  const imported = importTimetableFromPdfRaw(rawPayload);
  if (!imported.ok) {
    return {
      ok: false,
      reason: 'invalid-pdf',
      message: 'PDF wurde extrahiert, aber der Parser konnte keinen validen Stundenplan erzeugen.',
      issues: imported.issues,
    };
  }

  const model = {
    ...imported.model,
    timeslots: [...DEFAULT_TIMESLOTS],
    meta: {
      ...(imported.model?.meta || {}),
      source: latest.name,
      updatedAt: nowIso,
      generatedFrom: 'pdf-upload',
    },
  };

  writeJson(GENERATED_TARGET, model);

  return {
    ok: true,
    sourcePdf: latest.name,
    items: items.length,
    entries: imported.debug?.interpretedCount || 0,
    issues: imported.issues,
    generatedTarget: GENERATED_TARGET,
  };
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  buildTimetableFromLatestPdf()
    .then((result) => {
      if (!result.ok) {
        console.error(result.message);
        if (Array.isArray(result.issues) && result.issues.length) {
          console.error(`Parser-Hinweise: ${result.issues.join(' | ')}`);
        }
        process.exit(1);
      }

      console.log(`Stundenplan neu generiert aus ${result.sourcePdf} (${result.entries} Einträge).`);
      if (result.issues?.length) {
        console.log(`Parser-Hinweise: ${result.issues.join(' | ')}`);
      }
      console.log(`GENERATED: ${result.generatedTarget}`);
    })
    .catch((error) => {
      console.error(error?.message || error);
      process.exit(1);
    });
}
