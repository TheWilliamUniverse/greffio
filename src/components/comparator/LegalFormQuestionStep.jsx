import React from 'react';
import { SegmentedChoice } from '@/components/questionnaire/SegmentedChoice.jsx';
import { QuestionSectionHint } from '@/components/questionnaire/QuestionSectionHint.jsx';

export const LegalFormQuestionStep = ({ question, value, onChange, isMobile }) => (
  <div className="min-w-0 rounded-2xl border border-border bg-white p-4 shadow-elevation-sm md:p-6">
    <h2 className="text-lg font-extrabold leading-snug text-[hsl(var(--greffio-blue-900))] md:text-xl">
      {question.title}
    </h2>
    {question.subtitle ? (
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{question.subtitle}</p>
    ) : null}
    <div className={`mt-5 min-w-0 ${isMobile ? 'comparator-field-stack' : ''}`}>
      <SegmentedChoice
        options={question.options.map((opt) => ({ key: opt.value, label: opt.label }))}
        value={value}
        onChange={onChange}
      />
    </div>
    {question.hint ? (
      <QuestionSectionHint className="mt-4">{question.hint}</QuestionSectionHint>
    ) : null}
  </div>
);
