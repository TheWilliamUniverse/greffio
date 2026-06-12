import React from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion.jsx';
import { LEGAL_FORM_FAQ } from '@/config/legalFormComparator.js';

const splitInColumns = (entries) => {
  const middle = Math.ceil(entries.length / 2);
  return [entries.slice(0, middle), entries.slice(middle)];
};

export const LegalFormFaq = () => {
  const columns = splitInColumns(LEGAL_FORM_FAQ);

  return (
    <section className="mt-14 border-t border-border pt-12">
      <div className="mb-6 max-w-2xl">
        <p className="text-sm font-bold uppercase tracking-wide text-primary">FAQ</p>
        <h2 className="mt-2 text-2xl font-extrabold text-[hsl(var(--greffio-blue-900))]">
          Questions courantes
        </h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Les réponses aux hésitations les plus fréquentes avant de choisir une forme.
        </p>
      </div>
      <div className="grid items-start gap-4 lg:grid-cols-2">
        {columns.map((entries, columnIndex) => (
          <Accordion
            key={`faq-column-${columnIndex}`}
            type="single"
            collapsible
            className="rounded-xl border border-border bg-white px-4 shadow-elevation-sm"
          >
            {entries.map((entry, index) => (
              <AccordionItem key={entry.question} value={`faq-${columnIndex}-${index}`}>
                <AccordionTrigger className="text-left font-bold hover:no-underline">
                  {entry.question}
                </AccordionTrigger>
                <AccordionContent className="text-sm leading-7 text-muted-foreground">
                  {entry.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        ))}
      </div>
    </section>
  );
};
