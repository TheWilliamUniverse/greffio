import React from 'react';
import { BookOpen, Check, Landmark, Route } from 'lucide-react';
import { getDemarcheVisual } from '@/config/demarcheVisuals.js';

const footerIcons = {
  'Dossier guidé': BookOpen,
  'Suivi dossier': Landmark,
  'Parcours cadré': Route,
  'Pièces guidées': BookOpen,
  'Accompagnement dédié': BookOpen,
  'Reprise dossier': BookOpen,
  'Commande express': BookOpen,
};

export const FormalityChoiceCard = ({ item, selected, onClick }) => {
  const visual = getDemarcheVisual(item);
  const FooterIcon = footerIcons[visual.footerLabel] || BookOpen;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group flex h-full w-full flex-col rounded-2xl border bg-white p-5 text-left transition duration-200 ${
        selected
          ? 'border-primary/40 shadow-[0_8px_28px_rgba(15,39,80,0.12)] ring-2 ring-primary/15'
          : 'border-border/80 shadow-[0_2px_14px_rgba(15,39,80,0.06)] hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-[0_10px_28px_rgba(15,39,80,0.1)]'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl">
          <img
            src={visual.icon}
            alt=""
            width={80}
            height={80}
            className="h-full w-full object-cover"
            loading="lazy"
            decoding="async"
          />
        </div>
        <span className="rounded-full bg-[hsl(var(--secondary))] px-2.5 py-1 text-[11px] font-semibold tracking-wide text-primary">
          {visual.badge}
        </span>
      </div>

      <div className="mt-4 flex-1 space-y-1.5">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-primary/70">
          {visual.groupLabel}
        </p>
        <h3 className="text-[1.05rem] font-extrabold leading-snug tracking-tight text-[hsl(var(--greffio-blue-900))]">
          {item.label}
        </h3>
        <p className="text-sm leading-relaxed text-muted-foreground">{visual.description}</p>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3.5">
        <span className="inline-flex items-center gap-2 text-xs font-semibold text-primary/90">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-secondary/80">
            <FooterIcon className="h-3.5 w-3.5" />
          </span>
          {visual.footerLabel}
        </span>
        <span className="rounded-full bg-secondary/90 px-2.5 py-1 text-[11px] font-bold text-primary">
          {visual.eta}
        </span>
      </div>

      {selected ? (
        <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-secondary/70 px-2.5 py-1 text-xs font-semibold text-primary">
          <Check className="h-3.5 w-3.5" strokeWidth={3} />
          Sélectionnée
        </span>
      ) : null}
    </button>
  );
};
