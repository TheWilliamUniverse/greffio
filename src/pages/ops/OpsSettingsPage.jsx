import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button.jsx';
import { GREFFIO_OPS_TEAM } from '@/config/opsTeam.js';

export const OpsSettingsPage = () => (
  <div className="mx-auto max-w-3xl space-y-6">
    <div>
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Greffio Ops · Lot 3</p>
      <h2 className="mt-1 text-2xl font-extrabold text-slate-900">Paramètres ops</h2>
      <p className="mt-2 text-sm text-slate-600">Raccourcis cockpit et équipe formaliste.</p>
    </div>

    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="text-lg font-extrabold text-slate-900">Équipe formaliste</h3>
      <ul className="mt-4 space-y-2 text-sm text-slate-700">
        {GREFFIO_OPS_TEAM.map((member) => (
          <li key={member.id}>{member.name} · {member.role}</li>
        ))}
      </ul>
    </section>

    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="text-lg font-extrabold text-slate-900">Raccourcis</h3>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button type="button" variant="outline" className="bg-white" asChild>
          <Link to="/ops/cockpit">Cockpit</Link>
        </Button>
        <Button type="button" variant="outline" className="bg-white" asChild>
          <Link to="/interfaces">Interfaces & webhooks</Link>
        </Button>
        <Button type="button" variant="outline" className="bg-white" asChild>
          <Link to="/ops-observability">Observabilité</Link>
        </Button>
      </div>
    </section>
  </div>
);
