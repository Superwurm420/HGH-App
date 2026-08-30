import { formatLessonTime, formatPeriodLabel } from '@/lib/timetable/lesson-times';
import { minutesUntilStart, type ClassLessonState } from '@/lib/timetable/next-lessons';
import type { LessonEntry } from '@/lib/timetable/types';
import { formatSubject } from './format-subject';

type TvNextLessonsProps = {
  states: ClassLessonState[];
  nowMinutes: number;
};

/** „in 12 Min." bzw. „ab 09:45", wenn der Beginn weiter weg ist. */
function upcomingHint(lesson: LessonEntry, nowMinutes: number): string {
  const minutes = minutesUntilStart(lesson, nowMinutes);
  if (minutes === null) return formatLessonTime(lesson.time);
  if (minutes <= 0) return 'gleich';
  if (minutes <= 45) return `in ${minutes} Min.`;
  return `ab ${formatLessonTime(lesson.time).split('–')[0]}`;
}

function LessonBody({ lesson }: { lesson: LessonEntry }) {
  return (
    <>
      <p className="tv-next-subject">{lesson.subject ? formatSubject(lesson.subject) : 'Unterricht'}</p>
      <p className="tv-next-meta">
        <span>{formatPeriodLabel(lesson.period, lesson.periodEnd)} Stunde</span>
        <span>{formatLessonTime(lesson.time)}</span>
        {lesson.room ? <span className="tv-next-room">Raum {lesson.room}</span> : null}
      </p>
      {lesson.detail ? <p className="tv-next-detail">{lesson.detail}</p> : null}
    </>
  );
}

/**
 * Der Wandbildschirm während des Schultags: je Klasse eine Karte mit der
 * laufenden und der folgenden Stunde.
 *
 * Das ganze Tagesraster braucht hier niemand — wer im Flur vorbeigeht, will
 * wissen, wo es als Nächstes hingeht. Der freie Platz kommt der Schriftgröße
 * zugute, damit die Karten auch aus der Entfernung lesbar sind.
 */
export function TvNextLessons({ states, nowMinutes }: TvNextLessonsProps) {
  return (
    <div className="tv-next-grid" role="region" aria-label="Aktuelle und nächste Stunde je Klasse">
      {states.map(({ schoolClass, current, next }) => {
        const lesson = current ?? next;
        const following = current ? next : null;

        return (
          <article
            key={schoolClass}
            className="tv-next-card"
            data-state={current ? 'running' : next ? 'upcoming' : 'done'}
          >
            <header className="tv-next-head">
              <span className="tv-next-class">{schoolClass}</span>
              <span className="tv-next-badge">
                {current ? 'Jetzt' : next ? upcomingHint(next, nowMinutes) : 'Schluss'}
              </span>
            </header>

            {lesson ? (
              <LessonBody lesson={lesson} />
            ) : (
              <p className="tv-next-subject tv-next-empty">Unterricht beendet</p>
            )}

            {following ? (
              <p className="tv-next-following">
                <span className="tv-next-following-label">Danach</span>
                <span>{following.subject ?? 'Unterricht'}</span>
                <span>{formatLessonTime(following.time)}</span>
                {following.room ? <span>Raum {following.room}</span> : null}
              </p>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}
