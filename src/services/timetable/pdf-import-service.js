import { parsePdfTimetableV2 } from '../../parsers/pdf/pdf-timetable-v2.js';

export function importTimetableFromPdfRaw(pdfRawData) {
  const parsed = parsePdfTimetableV2(pdfRawData);

  return {
    ok: parsed.ok,
    model: parsed.model,
    issues: [...parsed.issues],
    debug: {
      rowCount: parsed.debug?.rowCount || 0,
      interpretedCount: parsed.debug?.interpretedCount || 0,
      specialEventCount: parsed.debug?.specialEventCount || 0,
    }
  };
}
