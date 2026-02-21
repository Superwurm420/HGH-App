import { loadTimetableSource } from '../src/data/timetable-source.js';

const originalFetch = globalThis.fetch;

function createResponse(payload) {
  return {
    ok: true,
    json: async () => payload,
  };
}

async function runScenario({ generatedModel }) {
  globalThis.fetch = async (url) => {
    if (String(url).includes('stundenplan.generated.json')) {
      if (generatedModel instanceof Error) throw generatedModel;
      return createResponse(generatedModel);
    }
    throw new Error(`Unexpected URL: ${url}`);
  };

  return loadTimetableSource();
}

const generatedPreferred = await runScenario({
  generatedModel: {
    meta: { updatedAt: '2026-03-01T10:00:00.000Z', source: 'stundenplan.generated.json' },
    timeslots: [{ id: '1', time: '08:00-08:45' }],
    classes: { HT11: { mo: [{ slotId: '1', subject: 'GENERATED' }] } },
  },
});

if (generatedPreferred.debug.source !== 'generated') {
  throw new Error(`Expected generated source, got ${generatedPreferred.debug.source}`);
}
if (generatedPreferred.data?.classes?.HT11?.mo?.[0]?.subject !== 'GENERATED') {
  throw new Error('Expected generated timetable payload to be selected');
}

async function runMissingScenario() {
  globalThis.fetch = async () => ({ ok: false, status: 404, json: async () => ({}) });
  return loadTimetableSource();
}

const missingGenerated = await runMissingScenario();
if (missingGenerated.debug.source !== 'empty') {
  throw new Error(`Expected empty source when generated file is missing, got ${missingGenerated.debug.source}`);
}
if (Object.keys(missingGenerated.data?.classes || {}).length !== 0) {
  throw new Error('Expected empty class map when generated timetable is unavailable');
}

globalThis.fetch = originalFetch;

console.log('timetable-source generated-only source-selection passed');
