import { SpecialEvent, Weekday, eventAppliesToDay } from '@/lib/timetable/types';

/**
 * Hervorgehobene Ankündigungen über dem Stundenplan des gewählten Tages.
 * Rendert nichts, wenn für den Tag keine anliegen.
 */
export function SpecialEventBanner({ events, day }: { events: SpecialEvent[]; day: Weekday }) {
  const dayEvents = events.filter((event) => eventAppliesToDay(event, day));
  if (dayEvents.length === 0) return null;

  return (
    <div className="special-event">
      {dayEvents.map((event) => (
        <p key={event.id} className="text-sm font-bold mb-1">{event.title}</p>
      ))}
    </div>
  );
}
