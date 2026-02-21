import { existsSync, readFileSync } from 'node:fs';

if (existsSync(new URL('../content/stundenplan.json', import.meta.url))) {
  throw new Error('Legacy file content/stundenplan.json must not exist');
}


const generatedPath = new URL('../content/stundenplan.generated.json', import.meta.url);
if (!existsSync(generatedPath)) {
  throw new Error('content/stundenplan.generated.json is missing');
}

const generated = JSON.parse(readFileSync(generatedPath, 'utf8'));
const slotIds = (generated.timeslots || []).map((slot) => slot.id);
const expectedSlotIds = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

if (slotIds.length !== expectedSlotIds.length) {
  throw new Error(`Expected 9 timeslots, got ${slotIds.length}`);
}

for (const id of expectedSlotIds) {
  if (!slotIds.includes(id)) throw new Error(`Missing timeslot id ${id}`);
}

if (!generated.meta?.source) {
  throw new Error('Expected meta.source to be present');
}

console.log('timetable-generated-contract passed');
