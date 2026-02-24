'use client';

import { useState } from 'react';

const WEEKDAY_LABELS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
const MONTH_NAMES = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember',
];

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function MiniCalendar() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  let startDow = firstDay.getDay() - 1;
  if (startDow < 0) startDow = 6;

  const cells: { day: number; thisMonth: boolean; date: Date }[] = [];

  const prevLastDay = new Date(year, month, 0);
  for (let i = startDow - 1; i >= 0; i--) {
    const d = prevLastDay.getDate() - i;
    cells.push({ day: d, thisMonth: false, date: new Date(year, month - 1, d) });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, thisMonth: true, date: new Date(year, month, d) });
  }
  const remaining = 42 - cells.length;
  for (let d = 1; d <= remaining; d++) {
    cells.push({ day: d, thisMonth: false, date: new Date(year, month + 1, d) });
  }

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
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-bold">Kalender</h2>
        <div className="flex items-center gap-2">
          <button onClick={goPrev} className="icon-btn !w-8 !h-8 !rounded-lg text-sm" type="button" aria-label="Vorheriger Monat">&#8249;</button>
          <span className="text-sm font-semibold min-w-[120px] text-center">{MONTH_NAMES[month]} {year}</span>
          <button onClick={goNext} className="icon-btn !w-8 !h-8 !rounded-lg text-sm" type="button" aria-label="Nächster Monat">&#8250;</button>
        </div>
      </div>

      <div className="cal-grid mb-1" aria-hidden="true">
        {WEEKDAY_LABELS.map((d) => (
          <div key={d} className="cal-cell text-xs font-semibold text-muted" style={{ aspectRatio: 'auto' }}>{d}</div>
        ))}
      </div>

      <div className="cal-grid" role="grid">
        {cells.map((cell, i) => {
          const isToday = isSameDay(cell.date, today);
          return (
            <div
              key={i}
              className={`cal-cell ${cell.thisMonth ? 'this-month' : ''} ${isToday ? 'today' : ''}`}
            >
              {cell.day}
            </div>
          );
        })}
      </div>
    </div>
  );
}
