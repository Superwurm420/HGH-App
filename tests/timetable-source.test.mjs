import { loadTimetableSource } from '../src/data/timetable-source.js';

const originalFetch = globalThis.fetch;

function createResponse(payload) {
  return {
    ok: true,
    json: async () => payload,
  };
}

function makePdfRaw(updatedAt, subjectLabel = 'PDF') {
  const tokenRows = [
    'class:HT11;day:mo;slot:1;subject:' + subjectLabel + ';teacher:X;room:1',
    'class:HT11;day:mo;slot:2;subject:' + subjectLabel + ';teacher:X;room:1',
    'class:HT11;day:di;slot:1;subject:' + subjectLabel + ';teacher:X;room:1',
    'class:HT11;day:di;slot:2;subject:' + subjectLabel + ';teacher:X;room:1',
    'class:HT11;day:mi;slot:1;subject:' + subjectLabel + ';teacher:X;room:1',
    'class:HT11;day:mi;slot:2;subject:' + subjectLabel + ';teacher:X;room:1',
    'class:HT11;day:do;slot:1;subject:' + subjectLabel + ';teacher:X;room:1',
    'class:HT11;day:do;slot:2;subject:' + subjectLabel + ';teacher:X;room:1',
    'class:HT11;day:fr;slot:1;subject:' + subjectLabel + ';teacher:X;room:1',
    'class:HT11;day:fr;slot:2;subject:' + subjectLabel + ';teacher:X;room:1',
  ];

  const items = tokenRows.map((text, idx) => ({ str: text, x: 10, y: 100 + idx * 10 }));
  return { meta: { updatedAt }, items };
}

async function runScenario({ pdfRaw, jsonModel }) {
  globalThis.fetch = async (url) => {
    if (String(url).includes('stundenplan.pdf.raw.json')) {
      return createResponse(pdfRaw);
    }
    if (String(url).includes('stundenplan.json')) {
      return createResponse(jsonModel);
    }
    throw new Error(`Unexpected URL: ${url}`);
  };

  return loadTimetableSource();
}

const newerJson = await runScenario({
  pdfRaw: makePdfRaw('2026-02-20T08:00:00.000Z', 'PDF'),
  jsonModel: {
    meta: { updatedAt: '2026-02-21T08:00:00.000Z' },
    timeslots: [{ id: '1', time: '08:00-08:45' }],
    classes: { HT11: { mo: [{ slotId: '1', subject: 'JSON' }] } },
  },
});

if (newerJson.debug.source !== 'json') {
  throw new Error(`Expected json source for newer JSON, got ${newerJson.debug.source}`);
}
if (newerJson.data?.classes?.HT11?.mo?.[0]?.subject !== 'JSON') {
  throw new Error('Expected JSON timetable payload to be selected');
}

const newerPdf = await runScenario({
  pdfRaw: makePdfRaw('2026-02-22T08:00:00.000Z', 'PDF'),
  jsonModel: {
    meta: { updatedAt: '2026-02-21T08:00:00.000Z' },
    timeslots: [{ id: '1', time: '08:00-08:45' }],
    classes: { HT11: { mo: [{ slotId: '1', subject: 'JSON' }] } },
  },
});

if (newerPdf.debug.source !== 'pdf-v2') {
  throw new Error(`Expected pdf-v2 source for newer PDF, got ${newerPdf.debug.source}`);
}
if (newerPdf.data?.classes?.HT11?.mo?.[0]?.subject !== 'PDF') {
  throw new Error('Expected parsed PDF timetable payload to be selected');
}



const newerPdfByValidFrom = await runScenario({
  pdfRaw: {
    meta: { source: 'current.pdf' },
    items: [
      { str: 'Gültig ab 24.02.2026', x: 5, y: 1 },
      ...makePdfRaw('not-a-date', 'PDF-VALIDFROM').items,
    ],
  },
  jsonModel: {
    meta: { validFrom: '2026-02-21' },
    timeslots: [{ id: '1', time: '08:00-08:45' }],
    classes: { HT11: { mo: [{ slotId: '1', subject: 'JSON' }] } },
  },
});

if (newerPdfByValidFrom.debug.source !== 'pdf-v2') {
  throw new Error(`Expected pdf-v2 source by validFrom, got ${newerPdfByValidFrom.debug.source}`);
}
if (newerPdfByValidFrom.data?.meta?.validFrom !== '2026-02-24') {
  throw new Error(`Expected parsed validFrom from PDF header, got ${newerPdfByValidFrom.data?.meta?.validFrom}`);
}



const equalTimestampPrefersPdf = await runScenario({
  pdfRaw: makePdfRaw('2026-02-21T08:00:00.000Z', 'PDF-EQUAL'),
  jsonModel: {
    meta: { updatedAt: '2026-02-21T08:00:00.000Z' },
    timeslots: [{ id: '1', time: '08:00-08:45' }],
    classes: { HT11: { mo: [{ slotId: '1', subject: 'JSON-EQUAL' }] } },
  },
});

if (equalTimestampPrefersPdf.debug.source !== 'pdf-v2') {
  throw new Error(`Expected pdf-v2 source for equal timestamps, got ${equalTimestampPrefersPdf.debug.source}`);
}
if (equalTimestampPrefersPdf.data?.classes?.HT11?.mo?.[0]?.subject !== 'PDF-EQUAL') {
  throw new Error('Expected PDF timetable payload to be selected for equal timestamps');
}

async function runMissingScenario() {
  globalThis.fetch = async () => ({ ok: false, status: 404, json: async () => ({}) });
  return loadTimetableSource();
}

const missingBoth = await runMissingScenario();
if (missingBoth.debug.source !== 'empty') {
  throw new Error(`Expected empty source when both files are missing, got ${missingBoth.debug.source}`);
}
if (Object.keys(missingBoth.data?.classes || {}).length !== 0) {
  throw new Error('Expected empty class map when no timetable files are available');
}

globalThis.fetch = originalFetch;

console.log('timetable-source source-selection passed');
