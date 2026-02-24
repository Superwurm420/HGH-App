import { LessonEntry, SpecialEvent, WeekPlan, WEEKDAYS, Weekday } from '@/lib/timetable/types';

const DAY_LABELS: Record<Weekday, string> = {
  MO: 'Mo', DI: 'Di', MI: 'Mi', DO: 'Do', FR: 'Fr',
};

const DAY_FULL: Record<Weekday, string> = {
  MO: 'Montag', DI: 'Dienstag', MI: 'Mittwoch', DO: 'Donnerstag', FR: 'Freitag',
};

function dayFromGermanDate(value: string): Weekday | null {
  const [datePart] = value.split(' ');
  const [day, month, year] = datePart.split('.').map(Number);
  if (!day || !month || !year) return null;
  const jsDay = new Date(year, month - 1, day).getDay();
  const map: Record<number, Weekday | null> = { 0: null, 1: 'MO', 2: 'DI', 3: 'MI', 4: 'DO', 5: 'FR', 6: null };
  return map[jsDay] ?? null;
}

function periodLabel(lesson: LessonEntry): string {
  if (lesson.periodEnd) return `${lesson.period}-${lesson.periodEnd}`;
  return `${lesson.period}`;
}

function timeStart(time: string): string {
  return time.split('-')[0].trim().replace('.', ':');
}

export function WeekSchedule({
  week,
  events,
  todayKey,
}: {
  schoolClass?: string;
  week: WeekPlan;
  events: SpecialEvent[];
  todayKey?: Weekday;
}) {
  return (
    <div className="overflow-x-auto">
      <div className="week-cols-wrapper">
        {WEEKDAYS.map((day) => {
          const dayEvents = events.filter((event) => dayFromGermanDate(event.startsAt) === day);
          const lessons = week[day];
          const isToday = day === todayKey;

          return (
            <div key={day} className="week-col">
              <div
                className={`week-col-header ${isToday ? 'today' : ''}`}
                title={DAY_FULL[day]}
              >
                <span>{DAY_LABELS[day]}</span>
                {isToday && <span className="week-col-today-dot" aria-label="heute" />}
              </div>

              {dayEvents.length > 0 && (
                <div className="week-col-event">
                  {dayEvents.map((event) => (
                    <p key={event.id} className="text-xs leading-tight">{event.title}</p>
                  ))}
                </div>
              )}

              {lessons.length === 0 ? (
                <p className="text-xs text-muted text-center py-3">–</p>
              ) : (
                <div className="week-col-lessons">
                  {lessons.map((lesson) => (
                    <div
                      key={`${day}-${lesson.period}-${lesson.time}`}
                      className="week-lesson-card"
                    >
                      <div className="week-lesson-meta">
                        <span className="week-period-badge">{periodLabel(lesson)}</span>
                        <span className="week-lesson-time">{timeStart(lesson.time)}</span>
                      </div>
                      <div className="week-lesson-subject">
                        {(lesson.subject ?? '–').split('/').map((part, idx, arr) => (
                          <span key={idx}>{part}{idx < arr.length - 1 && <br />}</span>
                        ))}
                      </div>
                      {lesson.room && (
                        <div className="week-lesson-room">R{lesson.room}</div>
                      )}
                      {lesson.detail && (
                        <div className="week-lesson-detail">{lesson.detail}</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
