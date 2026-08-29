'use client';

import { useEffect, useState } from 'react';

import { getBerlinNowParts, isWeekend, timeToMinutes, weekdayForToday } from '@/lib/berlin-time';
import type { Weekday } from '@/lib/timetable/types';

/**
 * Die Berliner Uhrzeit in Minuten seit Mitternacht — aber nur, wenn `day`
 * wirklich der heutige Wochentag ist. Sonst `null`.
 *
 * Beides ist nötig, damit die laufende Stunde richtig markiert wird:
 *
 * - Am Wochenende zeigt die App den Montagsplan (`weekdayForToday` weicht
 *   dorthin aus). Ohne die Wochenendprüfung wäre samstags um 10 Uhr die dritte
 *   Montagsstunde als „läuft gerade" markiert.
 * - In der Tagesansicht lässt sich ein anderer Wochentag wählen; die Uhrzeit
 *   sagt über dessen Plan nichts aus.
 *
 * Startwert ist `null`, damit Server und erster Client-Durchlauf dasselbe
 * ausgeben — eine im HTML bereits markierte Zeile wäre ein Hydration-Fehler.
 */
export function useMinutesOfDay(day: Weekday, intervalMs = 30_000): number | null {
  const [minutes, setMinutes] = useState<number | null>(null);

  useEffect(() => {
    const update = () => {
      const now = getBerlinNowParts();

      if (isWeekend(now.weekdayShort) || weekdayForToday() !== day) {
        setMinutes(null);
        return;
      }

      setMinutes(timeToMinutes(now.hour, now.minute));
    };

    update();
    const timer = window.setInterval(update, intervalMs);
    return () => window.clearInterval(timer);
  }, [day, intervalMs]);

  return minutes;
}
