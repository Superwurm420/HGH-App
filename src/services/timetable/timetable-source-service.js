import { PATHS } from '../../config/paths.js';
import { importTimetableFromPdfRaw } from './pdf-import-service.js';

async function fetchJson(url) {
  const res = await fetch(url, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.json();
}

function readTimestamp(value) {
  if (!value || typeof value !== 'string') return Number.NaN;
  const ts = Date.parse(value);
  return Number.isNaN(ts) ? Number.NaN : ts;
}

function pickPreferredSource({ jsonData, pdfData }) {
  const jsonTs = readTimestamp(jsonData?.meta?.updatedAt) || readTimestamp(jsonData?.meta?.validFrom);
  const pdfTs = readTimestamp(pdfData?.meta?.updatedAt) || readTimestamp(pdfData?.meta?.validFrom);

  // Operativ soll der TV-/Stundenplan immer mit der zuletzt hochgeladenen PDF synchron sein.
  // Daher wird eine valide PDF-Quelle grundsätzlich bevorzugt.
  if (pdfData) return 'pdf';

  if (!Number.isNaN(jsonTs)) return 'json';
  if (!Number.isNaN(pdfTs)) return 'pdf';

  return 'json';
}

function emptyTimetableModel(meta = {}) {
  return {
    meta,
    timeslots: [],
    classes: {}
  };
}

export async function loadTimetableSource() {
  const debug = { source: 'json', notes: [] };
  let parsedPdf = null;

  try {
    const pdfRaw = await fetchJson(PATHS.content.timetablePdfRawJson);
    parsedPdf = importTimetableFromPdfRaw(pdfRaw);
    debug.notes.push(...parsedPdf.issues);
    debug.notes.push(`PDF-Zeilen: ${parsedPdf.debug.rowCount}, Einträge: ${parsedPdf.debug.interpretedCount}, Sondertermine: ${parsedPdf.debug.specialEventCount}`);

    if (!parsedPdf.ok) debug.notes.push('Fallback auf content/stundenplan.json wegen fehlgeschlagener PDF-Validierung.');
  } catch (error) {
    debug.notes.push(`PDF-Rohdaten nicht verfügbar: ${error.message}`);
  }

  let data = null;
  try {
    data = await fetchJson(PATHS.content.timetableJson);
  } catch (error) {
    debug.notes.push(`JSON-Stundenplan nicht verfügbar: ${error.message}`);
  }

  if (parsedPdf?.ok && data) {
    const preferred = pickPreferredSource({ jsonData: data, pdfData: parsedPdf.model });
    debug.source = preferred === 'pdf' ? 'pdf-v2' : 'json';
    if (preferred === 'json') {
      debug.notes.push('PDF-Rohdaten nicht verwertbar; fallback auf JSON-Quelle.');
      return { data, debug };
    }
    debug.notes.push('Valide PDF-Rohdaten erkannt; verwende PDF als primäre Stundenplanquelle.');
    return { data: parsedPdf.model, debug };
  }

  if (parsedPdf?.ok) {
    debug.source = 'pdf-v2';
    debug.notes.push('JSON nicht verfügbar; verwende PDF-Rohdaten als Quelle.');
    return { data: parsedPdf.model, debug };
  }

  if (data) return { data, debug };

  debug.source = 'empty';
  debug.notes.push('Kein Stundenplan gefunden; App zeigt leeren Zustand statt Fehler.');
  return { data: emptyTimetableModel({ source: 'empty' }), debug };
}
