import { readFileSync } from 'node:fs';
import { parsePdfTimetableV2 } from '../src/parsers/pdf/pdf-timetable-v2.js';

function load(name) {
  return JSON.parse(readFileSync(new URL(`./fixtures/${name}`, import.meta.url)));
}

const valid = parsePdfTimetableV2(load('pdf-raw-valid.json'));
if (!valid.ok) {
  throw new Error(`Expected valid fixture to pass, got issues: ${valid.issues.join('; ')}`);
}

if (valid.model?.meta?.validFrom !== '2026-02-24') {
  throw new Error(`Expected validFrom=2026-02-24, got ${valid.model?.meta?.validFrom}`);
}

const invalid = parsePdfTimetableV2(load('pdf-raw-invalid.json'));
if (invalid.ok) {
  throw new Error('Expected invalid fixture to fail validation');
}

const loose = parsePdfTimetableV2(load('pdf-raw-loose-layout.json'));
if (!loose.ok) {
  throw new Error(`Expected loose-layout fixture to pass, got issues: ${loose.issues.join('; ')}`);
}

const specials = loose.model?.meta?.specialEvents || [];
if (!specials.length) {
  throw new Error('Expected special events to be detected in loose-layout fixture');
}


const weekSpecial = parsePdfTimetableV2(load('pdf-raw-week-special.json'));
if (!weekSpecial.ok) {
  throw new Error(`Expected week-special fixture to pass, got issues: ${weekSpecial.issues.join('; ')}`);
}

for (const day of ['mo', 'di', 'mi', 'do', 'fr']) {
  const entries = weekSpecial.model?.classes?.HT22?.[day] || [];
  if (entries.length !== 9) {
    throw new Error(`Expected 9 HT22 entries for ${day} from full-week special, got ${entries.length}`);
  }
}


const multiDaySpecial = parsePdfTimetableV2(load('pdf-raw-multi-day-special.json'));
if (!multiDaySpecial.ok) {
  throw new Error(`Expected multi-day fixture to pass, got issues: ${multiDaySpecial.issues.join('; ')}`);
}

for (const day of ['mo', 'mi', 'fr']) {
  const entries = multiDaySpecial.model?.classes?.HT21?.[day] || [];
  if (entries.length !== 4) {
    throw new Error(`Expected 4 HT21 entries for ${day} from multi-day special, got ${entries.length}`);
  }
}

const tuesdayEntries = multiDaySpecial.model?.classes?.HT21?.di || [];
if (tuesdayEntries.length !== 0) {
  throw new Error(`Expected no HT21 entries on di for multi-day special, got ${tuesdayEntries.length}`);
}

console.log('pdf-parser-v2 fixtures passed');
