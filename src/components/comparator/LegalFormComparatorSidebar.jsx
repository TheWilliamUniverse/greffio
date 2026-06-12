import React from 'react';
import { Link } from 'react-router-dom';
import { Scale } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { LegalFormBadge } from '@/components/comparator/LegalFormBadge.jsx';
import {
  COMPARATOR_MICRO_THRESHOLDS_2026,
  LEGAL_FORM_COMPARATOR_FORMS,
  LEGAL_FORM_FEATURE_BADGES,
} from '@/config/legalFormComparator.js';

const HIGHLIGHT_KEYS = ['sasu', 'sas', 'micro', 'sci'];

export const LegalFormComparatorSidebar = () => (
  <aside className="hidden min-w-0 lg:block">
    <div className="sticky top-24 space-y-4">
      <div className="rounded-2xl border border-border bg-white p-5 shadow-elevation-sm">
        <div className="mb-3 flex items-center gap-2 text-primary">
          <Scale className="h-5 w-5" aria-hidden />
          <p className="text-sm font-bold uppercase tracking-wide">Repères rapides</p>
        </div>
        <ul className="space-y-3">
          {HIGHLIGHT_KEYS.map((key) => {
            const form = LEGAL_FORM_COMPARATOR_FORMS[key];
            if (!form) return null;
            return (
              <li key={key} className="rounded-xl border border-border/80 bg-[hsl(var(--we-bg))] p-3.5">
                <div className="flex flex-wrap items-center gap-1.5">
                  <p className="text-sm font-extrabold text-[hsl(var(--greffio-blue-900))]">{form.label}</p>
                  {(LEGAL_FORM_FEATURE_BADGES[key] || []).slice(0, 1).map((badge) => (
                    <LegalFormBadge key={badge} tone="blue">{badge}</LegalFormBadge>
                  ))}
                </div>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">{form.shortPitch}</p>
              </li>
            );
          })}
        </ul>
        <p className="mt-4 text-xs leading-5 text-muted-foreground">
          Le tableau comparatif complet s’affiche avec votre résultat, à la fin du questionnaire.
        </p>
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
