import React from 'react';
import { BookOpen, Check, Landmark, Route } from 'lucide-react';
import { getDemarcheVisual } from '@/config/demarcheVisuals.js';

const footerIcons = {
  'Dossier guidé': BookOpen,
  'Suivi greffe': Landmark,
  'Parcours cadré': Route,
  'Suivi dossier': Landmark,
  'Pièces guidées': BookOpen,
};

export const FormalityChoiceCard = ({ item, selected, onClick }) => {
  const visual = getDemarcheVisual(item);
  const FooterIcon = footerIcons[visual.footerLabel] || BookOpen;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group flex h-full w-full flex-col rounded-2xl border bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
        selected
          ? 'border-primary ring-2 ring-primary/20'
          : 'border-border hover:border-primary/30'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl p-2 ${visual.iconBg}`}>
          <img
            src={visual.icon}
            alt=""
            className="h-full w-full object-contain"
            loading="lazy"
          />
        </div>
        <span className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-semibold text-primary">
          {visual.badge}
        </span>
      </div>

      <div className="mt-4 flex-1 space-y-1.5">
        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-primary/80">
          {visual.groupLabel}
        </p>
        <h3 className="text-base font-extrabold leading-snug text-foreground">{item.label}</h3>
        <p className="text-sm leading-relaxed text-muted-foreground">{visual.description}</p>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-border/70 pt-3">
        <span className="inline-flex items-center gap-2 text-xs font-semibold text-primary">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-secondary">
            <FooterIcon className="h-3.5 w-3.5" />
          </span>
          {visual.footerLabel}
        </span>
        <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-bold text-primary">
          {visual.eta}
        </span>
      </div>

      {selected ? (
        <span className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-primary">
          <Check className="h-3.5 w-3.5" strokeWidth={3} />
          Sélectionnée
        </span>
      ) : null}
    </button>
  );
};
