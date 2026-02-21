import { PATHS } from '../../config/paths.js';
import { ERROR_CODES } from '../../config/error-codes.js';
import { requestJson } from '../http/http-client.js';

async function fetchJson(url) {
  return requestJson(url, { cache: 'no-cache', timeoutMs: 7000, retries: 1 });
}

function emptyTimetableModel(meta = {}) {
  return {
    meta,
    timeslots: [],
    classes: {}
  };
}

export async function loadTimetableSource() {
  const debug = { source: 'generated', notes: [] };

  try {
    const generated = await fetchJson(PATHS.content.timetableGeneratedJson);
    debug.notes.push('Automatisch generierter Stundenplan geladen.');
    return { data: generated, debug };
  } catch (error) {
    debug.source = 'empty';
    debug.notes.push(`Generierter Stundenplan nicht verfügbar (${error.code || ERROR_CODES.NETWORK_FETCH}): ${error.message}`);
    debug.notes.push(`${ERROR_CODES.TIMETABLE_SOURCE_MISSING}: Kein generierter Stundenplan gefunden; App zeigt leeren Zustand statt Fehler.`);
    return { data: emptyTimetableModel({ source: 'empty' }), debug };
  }
}
