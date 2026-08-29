'use client';

import { useState } from 'react';

import { getBerlinNowParts } from '@/lib/berlin-time';

const WEEKDAY_LABELS = [
  { short: 'Mo', long: 'Montag' },
  { short: 'Di', long: 'Dienstag' },
  { short: 'Mi', long: 'Mittwoch' },
  { short: 'Do', long: 'Donnerstag' },
  { short: 'Fr', long: 'Freitag' },
  { short: 'Sa', long: 'Samstag' },
  { short: 'So', long: 'Sonntag' },
];

const MONTH_NAMES = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember',
];

type Cell = { day: number; month: number; year: number; thisMonth: boolean };

function buildCells(year: number, month: number): Cell[] {
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Montag als erster Wochentag — getDay() zählt ab Sonntag.
  let startDow = new Date(year, month, 1).getDay() - 1;
  if (startDow < 0) startDow = 6;

  const cells: Cell[] = [];
  const prevLastDay = new Date(year, month, 0);

  for (let i = startDow - 1; i >= 0; i -= 1) {
    const day = prevLastDay.getDate() - i;
    cells.push({ day, month: prevLastDay.getMonth(), year: prevLastDay.getFullYear(), thisMonth: false });
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push({ day, month, year, thisMonth: true });
  }

  const nextMonth = new Date(year, month + 1, 1);
  for (let day = 1; cells.length < 42; day += 1) {
    cells.push({ day, month: nextMonth.getMonth(), year: nextMonth.getFullYear(), thisMonth: false });
  }

  return cells;
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

export function MiniCalendar() {
  // „Heute" richtet sich nach Berlin, nicht nach der Zeitzone des Geräts —
  // sonst steht der Punkt auf einem Handy im Ausland auf dem falschen Tag.
  const [today] = useState(() => getBerlinNowParts());
  const [year, setYear] = useState(today.year);
  const [month, setMonth] = useState(today.month - 1);

  const cells = buildCells(year, month);
  const weeks = Array.from({ length: 6 }, (_, index) => cells.slice(index * 7, index * 7 + 7));

  const goPrev = () => {
    if (month === 0) { setMonth(11); setYear(year - 1); }
    else setMonth(month - 1);
  };

  const goNext = () => {
    if (month === 11) { setMonth(0); setYear(year + 1); }
    else setMonth(month + 1);
  };

  return (
    <div className="card surface">
      <div className="flex items-center justify-between gap-2 mb-3">
        <h2 className="text-base font-bold">Kalender</h2>
        <div className="flex items-center gap-1">
          <button onClick={goPrev} className="icon-btn cal-nav-btn" type="button" aria-label="Vorheriger Monat">&#8249;</button>
          <span className="text-sm font-semibold min-w-[116px] text-center" aria-live="polite">
            {MONTH_NAMES[month]} {year}
          </span>
          <button onClick={goNext} className="icon-btn cal-nav-btn" type="button" aria-label="Nächster Monat">&#8250;</button>
        </div>
      </div>

      <table className="cal-table">
        <caption className="sr-only">{MONTH_NAMES[month]} {year}</caption>
        <thead>
          <tr>
            {WEEKDAY_LABELS.map((weekday) => (
              <th key={weekday.short} scope="col" abbr={weekday.long}>{weekday.short}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {weeks.map((week, weekIndex) => (
            <tr key={weekIndex}>
              {week.map((cell, dayIndex) => {
                const isToday =
                  cell.year === today.year && cell.month === today.month - 1 && cell.day === today.day;
                const isWeekend = dayIndex >= 5;

                return (
                  <td
                    key={`${cell.year}-${cell.month}-${cell.day}`}
                    className={[
                      'cal-cell',
                      cell.thisMonth ? 'this-month' : '',
                      isWeekend ? 'weekend' : '',
                      isToday ? 'today' : '',
                    ].filter(Boolean).join(' ')}
                    aria-current={isToday ? 'date' : undefined}
                  >
                    <time dateTime={`${cell.year}-${pad(cell.month + 1)}-${pad(cell.day)}`}>{cell.day}</time>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
