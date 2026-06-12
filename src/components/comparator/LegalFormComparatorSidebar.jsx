import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Scale } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { COMPARATOR_MICRO_THRESHOLDS_2026, LEGAL_FORM_COMPARATOR_FORMS } from '@/config/legalFormComparator.js';

const HIGHLIGHT_KEYS = ['sasu', 'sas', 'micro', 'sci'];

export const LegalFormComparatorSidebar = ({ onScrollToTable }) => (
  <aside className="hidden min-w-0 lg:block">
    <div className="sticky top-24 space-y-4">
      <div className="rounded-2xl border border-border bg-white p-5 shadow-elevation-sm">
        <div className="mb-3 flex items-center gap-2 text-primary">
          <Scale className="h-5 w-5" />
          <p className="text-sm font-bold uppercase">Repères rapides</p>
        </div>
        <ul className="space-y-3">
          {HIGHLIGHT_KEYS.map((key) => {
            const form = LEGAL_FORM_COMPARATOR_FORMS[key];
            if (!form) return null;
            return (
              <li key={key} className="rounded-xl border border-border/80 bg-[hsl(var(--we-bg))] p-3">
                <p className="text-sm font-extrabold text-[hsl(var(--greffio-blue-900))]">{form.label}</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">{form.shortPitch}</p>
              </li>
            );
          })}
        </ul>
        <Button type="button" variant="outline" className="mt-4 h-10 w-full rounded-full text-sm font-bold" onClick={onScrollToTable}>
          Voir le tableau complet
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
      <div className="rounded-2xl border border-border bg-white p-5 text-sm leading-6 text-muted-foreground shadow-elevation-sm">
        <p className="font-bold text-foreground">Seuils micro 2026</p>
        <p className="mt-2">
          Ventes : {COMPARATOR_MICRO_THRESHOLDS_2026.goods.toLocaleString('fr-FR')} € · Services : {COMPARATOR_MICRO_THRESHOLDS_2026.services.toLocaleString('fr-FR')} €
        </p>
        <Button asChild variant="link" className="mt-2 h-auto px-0 text-primary">
          <Link to="/creation-entreprise">Comprendre les frais de création</Link>
        </Button>
      </div>
    </div>
  </aside>
);
