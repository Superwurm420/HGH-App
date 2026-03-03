import fs from 'node:fs/promises';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { compareTimetable } from './selectLatest';
import { readTimetableGeneratedData, upsertTimetableIndexEntry } from './generated-data';

const WEEKDAYS = ['MO', 'DI', 'MI', 'DO', 'FR'] as const;
const GENERATED_PATH = path.join(process.cwd(), 'src/generated/timetable-data.json');

type Weekday = (typeof WEEKDAYS)[number];

function createWeek(subject: string) {
  return Object.fromEntries(
    WEEKDAYS.map((day) => [day, day === 'MO' ? [{ period: 1, time: '08:00 - 08:45', subject }] : []]),
  ) as Record<Weekday, Array<{ period: number; time: string; subject: string }>>;
}

describe('timetable latest switch after upload', () => {
  let generatedBackup: string | null = null;

  afterEach(async () => {
    if (generatedBackup === null) {
      await fs.rm(GENERATED_PATH, { force: true });
    } else {
      await fs.writeFile(GENERATED_PATH, generatedBackup);
    }
  });

  it('switches latest candidate after uploading a newer KW file', async () => {
    generatedBackup = await fs.readFile(GENERATED_PATH, 'utf8').catch(() => null);

    const oldFile = 'Stundenplan_kw_10_Hj2_2024_25.pdf';
    const newFile = 'Stundenplan_kw_11_Hj2_2024_25.pdf';

    await fs.mkdir(path.dirname(GENERATED_PATH), { recursive: true });
    await fs.writeFile(
      GENERATED_PATH,
      JSON.stringify(
        {
          files: [
            {
              filename: oldFile,
              kw: 10,
              halfYear: 2,
              yearStart: 2024,
              yearEndShort: 25,
              href: `/content/timetables/${oldFile}`,
            },
          ],
          schedules: {
            [oldFile]: {
              HT11: createWeek('Alt'),
            },
          },
        },
        null,
        2,
      ),
    );

    await upsertTimetableIndexEntry({
      filename: newFile,
      lastModifiedMs: Date.now(),
      schedule: {
        HT11: createWeek('Neu'),
      },
    });

    const data = await readTimetableGeneratedData();
    const latest = data.files
      .filter((entry) => data.schedules[entry.filename])
      .sort(compareTimetable)[0];

    expect(data.schedules[newFile]).toBeDefined();
    expect(latest?.filename).toBe(newFile);
    expect(latest?.href).toBe(`/content/timetables/${newFile}`);
  });
});
