import React from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion.jsx';
import { LEGAL_FORM_GLOSSARY } from '@/config/legalFormComparator.js';

export const LegalFormGlossary = () => (
  <section className="mt-14 border-t border-border pt-12">
    <div className="mb-6 max-w-2xl">
      <p className="text-sm font-bold uppercase text-primary">Glossaire</p>
      <h2 className="mt-2 text-2xl font-extrabold text-[hsl(var(--greffio-blue-900))]">
        Termes utiles
      </h2>
    </div>
    <Accordion type="single" collapsible className="rounded-xl border border-border bg-white px-4 shadow-elevation-sm">
      {LEGAL_FORM_GLOSSARY.map((entry, index) => (
        <AccordionItem key={entry.term} value={`glossary-${index}`}>
          <AccordionTrigger className="text-left font-bold hover:no-underline">
            {entry.term}
          </AccordionTrigger>
          <AccordionContent className="text-sm leading-7 text-muted-foreground">
            {entry.definition}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  </section>
);
