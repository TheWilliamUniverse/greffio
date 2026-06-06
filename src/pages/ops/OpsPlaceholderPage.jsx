import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';

export const OpsPlaceholderPage = ({ title, description, ctaTo = '/ops/cockpit', ctaLabel = 'Retour au cockpit' }) => (
  <div className="mx-auto max-w-3xl rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm">
    <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Lot 2 · Greffio Ops</p>
    <h2 className="mt-2 text-2xl font-extrabold text-slate-900">{title}</h2>
    <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-slate-600">{description}</p>
    <Button type="button" className="mt-6" asChild>
      <Link to={ctaTo}>
        {ctaLabel}
        <ArrowRight className="h-4 w-4" />
      </Link>
    </Button>
  </div>
);
