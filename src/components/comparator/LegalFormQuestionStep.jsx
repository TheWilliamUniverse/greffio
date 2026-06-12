import React from 'react';
import { Check } from 'lucide-react';
import { QuestionSectionHint } from '@/components/questionnaire/QuestionSectionHint.jsx';
import { cn } from '@/lib/utils';

const OptionCard = ({ option, selected, onSelect }) => (
  <button
    type="button"
    role="radio"
    aria-checked={selected}
    onClick={() => onSelect(option.value)}
    className={cn(
      'group flex min-h-[3.5rem] w-full min-w-0 items-start gap-3 rounded-xl border-2 p-4 text-left transition-all duration-200',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
      selected
        ? 'border-primary bg-[#f0f6ff] shadow-sm'
        : 'border-[#e3ebf7] bg-white hover:border-primary/35 hover:bg-muted/40',
    )}
  >
    <span
      aria-hidden
      className={cn(
        'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
        selected ? 'border-primary bg-primary text-white' : 'border-[#c5d2e6] bg-white group-hover:border-primary/45',
      )}
    >
      {selected ? <Check className="h-3 w-3" strokeWidth={3.5} /> : null}
    </span>
    <span className="min-w-0">
      <span className={cn(
        'block text-[15px] leading-6 md:text-base',
        selected ? 'font-bold text-[hsl(var(--greffio-blue-900))]' : 'font-semibold text-foreground',
      )}
      >
        {option.label}
      </span>
      {option.description ? (
        <span className="mt-0.5 block text-xs leading-5 text-muted-foreground md:text-[13px]">
          {option.description}
        </span>
      ) : null}
    </span>
  </button>
);

export const LegalFormQuestionStep = ({ question, value, onChange, isMobile }) => (
  <div className="min-w-0 rounded-2xl border border-border bg-white p-5 shadow-elevation-sm md:p-7">
    <h2 className="text-lg font-extrabold leading-snug text-[hsl(var(--greffio-blue-900))] md:text-2xl">
      {question.title}
    </h2>
    {question.subtitle ? (
      <p className="mt-2 text-sm leading-6 text-muted-foreground md:text-[15px] md:leading-7">
        {question.subtitle}
      </p>
    ) : null}
    <div
      role="radiogroup"
      aria-label={question.title}
      className={cn(
        'mt-6 grid min-w-0 gap-2.5 sm:grid-cols-2',
        isMobile && 'comparator-field-stack',
      )}
    >
      {question.options.map((option) => (
        <OptionCard
          key={option.value}
          option={option}
          selected={String(value || '') === String(option.value)}
          onSelect={onChange}
        />
      ))}
    </div>
    {question.hint ? (
      <QuestionSectionHint className="mt-5" title="Bon à savoir" note={question.hint} />
    ) : null}
  </div>
);
