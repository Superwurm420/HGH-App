import { LessonEntry, SpecialEvent, Weekday, eventAppliesToDay } from '@/lib/timetable/types';
import styles from './TodaySchedule.module.css';

function formatSubject(subject: string) {
  return subject.split('/').map((part, i, arr) => (
    <span key={i}>
      {part}{i < arr.length - 1 && <>{'/\u200B'}</>}
    </span>
  ));
}

export function TodaySchedule({
  day,
  lessons,
  events,
}: {
  day: Weekday;
  lessons: LessonEntry[];
  events: SpecialEvent[];
}) {
  const todaysEvents = events.filter((event) => eventAppliesToDay(event, day));

  return (
    <div>
      {todaysEvents.length > 0 && (
        <div className={styles.specialEvent}>
          {todaysEvents.map((event) => (
            <p key={event.id} className="text-sm font-bold mb-1">{event.title}</p>
          ))}
        </div>
      )}

      {lessons.length === 0 ? (
        <p className="text-sm text-muted">Kein Unterricht erkannt.</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-[var(--line)]">
          {lessons.map((lesson) => (
            <div key={`${lesson.period}-${lesson.time}`} className="tt-row">
              <div className="tt-cell tt-period-cell">
                <span className="tt-period-num">
                  {lesson.periodEnd ? `Std. ${lesson.period}/${lesson.periodEnd}` : `Std. ${lesson.period}`}
                </span>
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
          ))}
        </div>
      )}
    </div>
  );
}
