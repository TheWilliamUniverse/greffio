import React, { useMemo, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { cn } from '@/lib/utils.js';

const MONTHS = [
  'Janvier',
  'Février',
  'Mars',
  'Avril',
  'Mai',
  'Juin',
  'Juillet',
  'Août',
  'Septembre',
  'Octobre',
  'Novembre',
  'Décembre',
];

const pad = (value) => String(value).padStart(2, '0');

const parseIsoDate = (value) => {
  const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  const date = new Date(year, month, day);
  if (date.getFullYear() !== year || date.getMonth() !== month || date.getDate() !== day) return null;
  return date;
};

const toIsoDate = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const daysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
const mondayFirstWeekdayOffset = (year, month) => {
  const nativeDay = new Date(year, month, 1).getDay();
  return (nativeDay + 6) % 7;
};

export const MobileBirthDatePicker = ({
  value = '',
  onChange,
  onAdvance,
  canAdvance = false,
  invalid = false,
  errorMessage = '',
  extra = null,
}) => {
  const selected = parseIsoDate(value);
  const today = useMemo(() => new Date(), []);
  const initial = selected || new Date(today.getFullYear() - 25, today.getMonth(), today.getDate());
  const [viewYear, setViewYear] = useState(initial.getFullYear());
  const [viewMonth, setViewMonth] = useState(initial.getMonth());

  const years = useMemo(() => {
    const currentYear = today.getFullYear();
    return Array.from({ length: 91 }, (_, index) => currentYear - index);
  }, [today]);

  const days = useMemo(() => (
    Array.from({ length: daysInMonth(viewYear, viewMonth) }, (_, index) => index + 1)
  ), [viewMonth, viewYear]);
  const firstWeekdayOffset = useMemo(
    () => mondayFirstWeekdayOffset(viewYear, viewMonth),
    [viewMonth, viewYear],
  );

  const shiftMonth = (delta) => {
    const next = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(next.getFullYear());
    setViewMonth(next.getMonth());
  };

  const selectDay = (day) => {
    onChange?.(toIsoDate(new Date(viewYear, viewMonth, day)));
  };

  const selectedLabel = selected
    ? selected.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
    : 'Sélectionnez une date';

  return (
    <div className="mx-auto w-full max-w-md rounded-[2rem] border border-[#d4e2f5] bg-white p-4 shadow-[0_18px_50px_rgba(15,52,96,0.12)]">
      <div className="flex items-start gap-3 rounded-3xl bg-secondary/50 p-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-primary shadow-sm">
          <CalendarDays className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">Date de naissance</p>
          <p className="mt-1 text-lg font-extrabold text-[hsl(var(--greffio-blue-900))]">{selectedLabel}</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">Choisissez le mois, l’année, puis le jour.</p>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-2">
        <Button type="button" variant="outline" size="icon" className="h-10 w-10 rounded-2xl bg-white" onClick={() => shiftMonth(-1)}>
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        </Button>
        <div className="grid flex-1 grid-cols-2 gap-2">
          <select
            value={viewMonth}
            onChange={(event) => setViewMonth(Number(event.target.value))}
            className="h-11 rounded-2xl border border-border bg-white px-3 text-sm font-bold text-foreground"
            aria-label="Mois de naissance"
          >
            {MONTHS.map((month, index) => (
              <option key={month} value={index}>{month}</option>
            ))}
          </select>
          <select
            value={viewYear}
            onChange={(event) => setViewYear(Number(event.target.value))}
            className="h-11 rounded-2xl border border-border bg-white px-3 text-sm font-bold text-foreground"
            aria-label="Année de naissance"
          >
            {years.map((year) => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
        <Button type="button" variant="outline" size="icon" className="h-10 w-10 rounded-2xl bg-white" onClick={() => shiftMonth(1)}>
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>

      <div className="mt-4 grid grid-cols-7 gap-1.5">
        {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((day, index) => (
          <span key={`${day}-${index}`} className="py-1 text-center text-[11px] font-bold text-muted-foreground">{day}</span>
        ))}
        {Array.from({ length: firstWeekdayOffset }, (_, index) => (
          <span key={`empty-${viewYear}-${viewMonth}-${index}`} aria-hidden="true" />
        ))}
        {days.map((day) => {
          const isSelected = selected
            && selected.getFullYear() === viewYear
            && selected.getMonth() === viewMonth
            && selected.getDate() === day;
          return (
            <button
              key={day}
              type="button"
              onClick={() => selectDay(day)}
              className={cn(
                'h-10 rounded-2xl text-sm font-bold transition',
                isSelected
                  ? 'bg-primary text-white shadow-md'
                  : 'bg-[#f6f8fc] text-[hsl(var(--greffio-blue-900))] hover:bg-secondary',
              )}
            >
              {day}
            </button>
          );
        })}
      </div>

      {extra ? <div className="mt-4">{extra}</div> : null}
      {errorMessage || invalid ? (
        <p className="mt-3 text-xs font-medium text-destructive">{errorMessage || 'Sélectionnez une date valide.'}</p>
      ) : null}

      <Button
        type="button"
        className="mt-4 h-12 w-full rounded-2xl"
        disabled={!canAdvance}
        onClick={onAdvance}
      >
        Continuer
      </Button>
    </div>
  );
};
