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

const gridTeacherRoom = parsePdfTimetableV2(load('pdf-raw-grid-teacher-room.json'));
if (gridTeacherRoom.ok) {
  throw new Error('Expected compact grid fixture to fail min-entry validation');
}

const ht11Monday = gridTeacherRoom.model?.classes?.HT11?.mo?.[0];
if (!ht11Monday || ht11Monday.subject !== 'Deutsch' || ht11Monday.teacher !== 'MEL' || ht11Monday.room !== '101') {
  throw new Error(`Expected HT11 Mo slot 1 to map subject/teacher/room correctly, got ${JSON.stringify(ht11Monday)}`);
}

const ht12Monday = gridTeacherRoom.model?.classes?.HT12?.mo?.[0];
if (!ht12Monday || ht12Monday.subject !== 'Englisch' || ht12Monday.teacher !== 'WEN' || ht12Monday.room !== '9') {
  throw new Error(`Expected HT12 Mo slot 1 to map subject/teacher/room correctly, got ${JSON.stringify(ht12Monday)}`);
}

const ht21Tuesday = gridTeacherRoom.model?.classes?.HT21?.di?.[0];
if (!ht21Tuesday || ht21Tuesday.subject !== 'CAD' || ht21Tuesday.teacher !== 'HOFF' || ht21Tuesday.room !== '4') {
  throw new Error(`Expected HT21 Di slot 2 to map subject/teacher/room correctly, got ${JSON.stringify(ht21Tuesday)}`);
}


const gridSupplementRow = parsePdfTimetableV2(load('pdf-raw-grid-supplement-row.json'));
if (gridSupplementRow.ok) {
  throw new Error('Expected supplement-row fixture to fail min-entry validation');
}

const supplementHt11 = gridSupplementRow.model?.classes?.HT11?.mo?.[0];
if (!supplementHt11 || supplementHt11.teacher !== 'MEL' || supplementHt11.room !== '101') {
  throw new Error(`Expected HT11 supplement row to set teacher/room, got ${JSON.stringify(supplementHt11)}`);
}

const supplementHt12 = gridSupplementRow.model?.classes?.HT12?.mo?.[0];
if (!supplementHt12 || supplementHt12.teacher !== 'WEN' || supplementHt12.room !== '9') {
  throw new Error(`Expected HT12 supplement row to set teacher/room, got ${JSON.stringify(supplementHt12)}`);
}


const labeledMeta = parsePdfTimetableV2({
  meta: { source: 'fixture-labeled.pdf' },
  items: [
    { str: 'HT11', x: 120, y: 10 },
    { str: 'HT12', x: 220, y: 10 },
    { str: 'HT21', x: 320, y: 10 },
    { str: 'Mo', x: 20, y: 20 },
    { str: '1.', x: 40, y: 20 },
    { str: 'Mathe', x: 120, y: 20 },
    { str: 'Lehrer', x: 145, y: 20 },
    { str: 'MEL', x: 166, y: 20 },
    { str: 'Raum', x: 160, y: 20 },
    { str: 'B 204', x: 168, y: 20 }
  ]
});

if (labeledMeta.ok) {
  throw new Error('Expected labeled-meta fixture to fail min-entry validation');
}

const labeledHt11 = labeledMeta.model?.classes?.HT11?.mo?.[0];
if (!labeledHt11 || labeledHt11.teacher !== 'MEL' || labeledHt11.room !== 'B 204') {
  throw new Error(`Expected labeled metadata tokens to set teacher/room, got ${JSON.stringify(labeledHt11)}`);
}

console.log('pdf-parser-v2 fixtures passed');
