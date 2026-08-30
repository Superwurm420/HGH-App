'use client';

import { useMemo } from 'react';

import { collectClassLessonStates, hasOngoingSchoolDay } from '@/lib/timetable/next-lessons';
import type { ParsedSchedule, Weekday } from '@/lib/timetable/types';
import { TvNextLessons } from './TvNextLessons';
import { TvTimetableGrid } from './TvTimetableGrid';
import { useMinutesOfDay } from './use-berlin-minutes';

type TvSchedulePanelProps = {
  schedulesByClass: ParsedSchedule;
  day: Weekday;
};

/**
 * Entscheidet, welche Stundenplan-Ansicht auf dem Wandbildschirm läuft.
 *
 * Solange heute noch Unterricht ansteht, zeigt der Bildschirm je Klasse nur die
 * laufende und die nächste Stunde — das ist die Frage, die im Flur wirklich
 * gestellt wird, und es lässt Platz für große Schrift. Nach Schulschluss (und
 * am Wochenende, wo der Montagsplan steht) kommt wieder der vollständige
 * Tagesplan.
 *
 * `nowMinutes` ist im ersten Durchlauf `null` — Server und Client rendern
 * dadurch dasselbe, und erst der Effekt schaltet um.
 */
export function TvSchedulePanel({ schedulesByClass, day }: TvSchedulePanelProps) {
  const nowMinutes = useMinutesOfDay(day);

  const states = useMemo(
    () => (nowMinutes === null ? [] : collectClassLessonStates(schedulesByClass, day, nowMinutes)),
    [day, nowMinutes, schedulesByClass],
  );

  if (nowMinutes !== null && hasOngoingSchoolDay(states)) {
    return (
      <>
        <header className="tv-panel-head">
          <h2>Jetzt &amp; als Nächstes</h2>
          <p className="tv-panel-hint">Nach Schulschluss erscheint hier wieder der ganze Tagesplan.</p>
        </header>
        <TvNextLessons states={states} nowMinutes={nowMinutes} />
      </>
    );
  }

  return (
    <>
      <header className="tv-panel-head">
        <h2>Stundenplan heute</h2>
      </header>
      <TvTimetableGrid schedulesByClass={schedulesByClass} day={day} nowMinutes={nowMinutes} />
    </>
  );
}
