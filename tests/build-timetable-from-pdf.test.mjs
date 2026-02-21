import { parseTimetableFilenameOrder } from '../scripts/build-timetable-from-pdf.mjs';

function expectGreater(a, b, message) {
  if (!(a > b)) {
    throw new Error(`${message} (expected ${a} > ${b})`);
  }
}

const kw45Hj1 = parseTimetableFilenameOrder('Stundenplan_kw_45_Hj1_2025_26.pdf');
const kw2Hj2 = parseTimetableFilenameOrder('Stundenplan_kw_2_Hj2_2024_25.pdf');
expectGreater(kw45Hj1, kw2Hj2, 'Hj1 2025/26 should be newer than Hj2 2024/25');

const newerWeekSameHalfYear = parseTimetableFilenameOrder('Stundenplan_kw_46_Hj1_2025_26.pdf');
expectGreater(newerWeekSameHalfYear, kw45Hj1, 'Higher KW in same half-year should win');

const hj2ShouldUseEndYear = parseTimetableFilenameOrder('Stundenplan_kw_1_Hj2_2025_26.pdf');
expectGreater(hj2ShouldUseEndYear, kw45Hj1, 'Hj2 should map to school-year end and outrank Hj1 of same school year');

const invalid = parseTimetableFilenameOrder('unbekannt.pdf');
if (invalid !== Number.NEGATIVE_INFINITY) {
  throw new Error('Invalid filename should rank as negative infinity');
}

console.log('build-timetable filename ordering passed');
