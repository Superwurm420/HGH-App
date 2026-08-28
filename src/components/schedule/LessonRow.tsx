import { LessonEntry } from '@/lib/timetable/types';
import { formatSubject } from './format-subject';

/**
 * Eine Zeile im Stundenplan — Stunde, Fach, Raum/Hinweis.
 *
 * Geteilt zwischen Tagesansicht (`/stundenplan`) und Startseite. Die beiden
 * beschriften die Stunde unterschiedlich („Std. 1/2" vs. „1+2."), deshalb kommt
 * das Label von außen; alles andere ist identisch und lag vorher doppelt vor.
 */
export function LessonRow({ lesson, periodLabel }: { lesson: LessonEntry; periodLabel: string }) {
  return (
    <div className="tt-row">
      <div className="tt-cell tt-period-cell">
        <span className="tt-period-num">{periodLabel}</span>
        <span className="tt-period-time">{lesson.time}</span>
      </div>
      <div className="tt-cell tt-subject-cell">
        {lesson.subject ? formatSubject(lesson.subject) : '-'}
      </div>
      <div className="tt-cell tt-info-cell">
        {lesson.room && <span className="tt-room">{lesson.room}</span>}
        {lesson.detail && <span className="tt-detail">{lesson.detail}</span>}
      </div>
    </div>
  );
}
