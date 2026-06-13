import React, { useCallback, useRef, useState } from 'react';
import { Briefcase, ChevronLeft, ChevronRight, Landmark, ShieldCheck, Users } from 'lucide-react';
import {
  COMPARATOR_FORM_ORDER,
  LEGAL_FORM_COMPARATOR_FORMS,
  LEGAL_FORM_IDEAL_FOR,
  LEGAL_FORM_FEATURE_BADGES,
} from '@/config/legalFormComparator.js';
import { getFormAvailability } from '@/config/catalog.js';
import { AvailabilityBadge, LegalFormBadge } from '@/components/comparator/LegalFormBadge.jsx';
import { cn } from '@/lib/utils.js';

const associatesLabel = (form) => {
  if (form.minAssociates === 1 && form.maxAssociates === 1) return '1 (seul)';
  if (form.maxAssociates) return `${form.minAssociates} à ${form.maxAssociates}`;
  return `${form.minAssociates} ou plus`;
};

const ComplexityDots = ({ level }) => (
  <span className="inline-flex items-center gap-1" aria-label={`Complexité ${level} sur 5`}>
    {[1, 2, 3, 4, 5].map((dot) => (
      <span
        key={dot}
        aria-hidden
        className={`h-1.5 w-1.5 rounded-full ${dot <= level ? 'bg-primary' : 'bg-[#e3ebf7]'}`}
      />
    ))}
  </span>
);

const SLIDE_ROWS = [
  { key: 'associates', label: 'Associés', icon: Users, value: (form) => associatesLabel(form) },
  { key: 'liability', label: 'Responsabilité', icon: ShieldCheck, value: (form) => form.liability },
  { key: 'tax', label: 'Fiscalité indicative', icon: Landmark, value: (form) => form.taxDefault },
  { key: 'social', label: 'Social dirigeant', icon: Briefcase, value: (form) => form.social },
];

const FormSlide = ({ formKey, index, total }) => {
  const form = LEGAL_FORM_COMPARATOR_FORMS[formKey];
  if (!form) return null;
  return (
    <article
      data-comparator-slide
      className="flex w-[86%] max-w-[380px] shrink-0 snap-center flex-col rounded-2xl border border-border bg-white p-5 shadow-elevation-sm sm:w-[380px]"
      aria-label={`${form.label} – fiche ${index + 1} sur ${total}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
            {index + 1} / {total}
          </p>
          <h3 className="mt-0.5 text-xl font-extrabold text-[hsl(var(--greffio-blue-900))]">{form.label}</h3>
        </div>
        <AvailabilityBadge availability={getFormAvailability(form.availabilityKey)} />
      </div>

      <p className="mt-2 text-sm font-semibold text-foreground">
        Idéal pour : <span className="font-medium text-muted-foreground">{LEGAL_FORM_IDEAL_FOR[formKey]}</span>
      </p>

      {(LEGAL_FORM_FEATURE_BADGES[formKey] || []).length ? (
        <div className="mt-2.5 flex flex-wrap gap-1">
          {LEGAL_FORM_FEATURE_BADGES[formKey].map((badge) => (
            <LegalFormBadge key={badge} tone="blue">{badge}</LegalFormBadge>
          ))}
        </div>
      ) : null}

      <dl className="mt-4 flex-1 space-y-3 border-t border-border/70 pt-4">
        {SLIDE_ROWS.map((row) => (
          <div key={row.key} className="flex items-start gap-2.5">
            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-secondary/70">
              <row.icon className="h-3.5 w-3.5 text-primary" />
            </span>
            <div className="min-w-0">
              <dt className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{row.label}</dt>
              <dd className="mt-0.5 text-sm leading-5 text-foreground">{row.value(form)}</dd>
            </div>
          </div>
        ))}
      </dl>

      <div className="mt-4 flex items-center justify-between gap-3 border-t border-border/70 pt-3.5">
        <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Complexité</span>
        <ComplexityDots level={form.complexity} />
      </div>
    </article>
  );
};

export const LegalFormComparisonTable = () => {
  const trackRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const total = COMPARATOR_FORM_ORDER.length;

  const handleScroll = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    const slides = Array.from(track.querySelectorAll('[data-comparator-slide]'));
    if (!slides.length) return;
    const center = track.scrollLeft + track.clientWidth / 2;
    let closest = 0;
    let closestDistance = Infinity;
    slides.forEach((slide, index) => {
      const slideCenter = slide.offsetLeft + slide.offsetWidth / 2;
      const distance = Math.abs(slideCenter - center);
      if (distance < closestDistance) {
        closestDistance = distance;
        closest = index;
      }
    });
    setActiveIndex(closest);
  }, []);

  const scrollToSlide = useCallback((index) => {
    const track = trackRef.current;
    if (!track) return;
    const slides = track.querySelectorAll('[data-comparator-slide]');
    const slide = slides[Math.max(0, Math.min(index, slides.length - 1))];
    if (!slide) return;
    track.scrollTo({
      left: slide.offsetLeft - (track.clientWidth - slide.offsetWidth) / 2,
      behavior: 'smooth',
    });
  }, []);

  return (
    <section id="comparateur-tableau" className="min-w-0 scroll-mt-24">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-2xl">
          <p className="text-sm font-bold uppercase tracking-wide text-primary">Comparatif</p>
          <h2 className="mt-2 text-2xl font-extrabold text-[hsl(var(--greffio-blue-900))]">
            Synthèse des principales formes
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Faites défiler les fiches pour comparer. Vue indicative – le choix doit être confirmé selon votre situation.
          </p>
        </div>
        <div className="hidden items-center gap-2 sm:flex">
          <button
            type="button"
            onClick={() => scrollToSlide(activeIndex - 1)}
            disabled={activeIndex === 0}
            aria-label="Fiche précédente"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-white text-foreground shadow-sm transition hover:border-primary/40 disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => scrollToSlide(activeIndex + 1)}
            disabled={activeIndex === total - 1}
            aria-label="Fiche suivante"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-white text-foreground shadow-sm transition hover:border-primary/40 disabled:opacity-40"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div
        ref={trackRef}
        onScroll={handleScroll}
        role="group"
        aria-label="Fiches comparatives des formes juridiques"
        className="flex snap-x snap-mandatory items-stretch gap-4 overflow-x-auto scroll-smooth px-1 pb-3 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {COMPARATOR_FORM_ORDER.map((formKey, index) => (
          <FormSlide key={formKey} formKey={formKey} index={index} total={total} />
        ))}
      </div>

      <div className="mt-3 flex items-center justify-center gap-1.5" aria-hidden>
        {COMPARATOR_FORM_ORDER.map((formKey, index) => (
          <button
            key={formKey}
            type="button"
            tabIndex={-1}
            onClick={() => scrollToSlide(index)}
            className={cn(
              'h-1.5 rounded-full transition-all duration-300',
              index === activeIndex ? 'w-6 bg-primary' : 'w-1.5 bg-[#d4e2f5]',
            )}
          />
        ))}
      </div>
    </section>
  );
};
