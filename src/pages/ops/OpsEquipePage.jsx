import React from 'react';
import { Mail } from 'lucide-react';
import { GREFFIO_COMPANY, GREFFIO_OPS_TEAM } from '@/config/opsTeam.js';

export const OpsEquipePage = () => (
  <div className="mx-auto max-w-5xl space-y-6">
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Société éditrice</p>
      <h2 className="mt-2 text-2xl font-extrabold text-slate-900">{GREFFIO_COMPANY.name}</h2>
      <a href={`mailto:${GREFFIO_COMPANY.email}`} className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-slate-700 hover:text-slate-900">
        <Mail className="h-4 w-4" />
        {GREFFIO_COMPANY.email}
      </a>
    </section>

    <section className="grid gap-4 md:grid-cols-3">
      {GREFFIO_OPS_TEAM.map((member) => (
        <article key={member.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white">
            {member.initials}
          </div>
          <h3 className="mt-4 text-lg font-extrabold text-slate-900">{member.name}</h3>
          <p className="text-sm text-slate-500">{member.title}</p>
          <p className="mt-3 text-xs font-bold uppercase tracking-wide text-slate-400">{member.role}</p>
          <a href={`mailto:${member.email}`} className="mt-3 block text-sm font-semibold text-slate-700 hover:text-slate-900">
            {member.email}
          </a>
        </article>
      ))}
    </section>
  </div>
);
