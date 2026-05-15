import React, { useState } from 'react';
import { CalendarClock, CheckCircle2, Inbox, MessageSquareText, Send, ShieldCheck, UserPlus, Users } from 'lucide-react';
import { Sidebar } from '@/components/Sidebar.jsx';
import { StatusBadge } from '@/components/StatusBadge.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { getChatHistory, getDossiers } from '@/utils/localStorage.js';

const workstreams = [
  { name: 'Équipe formalités Greffio', role: 'Contrôle statuts, formulaires, bénéficiaires effectifs', status: 'Activable' },
  { name: 'Partenaires tiers', role: 'Banque, annonce légale, dépôt et relances', status: 'Sur dossier' },
  { name: 'Support client Greffio', role: 'Questions, pièces, accès et paiements', status: 'Disponible' },
];

export const TeamPage = () => {
  const [message, setMessage] = useState('');
  const dossiers = getDossiers();
  const messages = getChatHistory();
  const queue = dossiers.map((dossier) => ({
    ...dossier,
    ownerLabel: dossier.blockers.length ? 'Action client requise' : 'Suivi équipe',
  }));
  const currentDossier = queue[0];

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden bg-background">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-5 md:p-8">
        <div className="mx-auto grid max-w-7xl gap-7 xl:grid-cols-[1fr_410px]">
          <section className="space-y-6">
            <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
              <div>
                <p className="text-sm font-bold uppercase text-primary">Relation équipe-client</p>
                <h1 className="mt-2 text-3xl font-extrabold">Équipe Greffio, clients et partenaires</h1>
                <p className="mt-2 text-sm text-muted-foreground">Un espace partagé pour piloter les demandes, pièces, messages et validations de chaque formalité réelle.</p>
              </div>
              <Button>
                <UserPlus className="h-4 w-4" />
                Inviter un intervenant
              </Button>
            </div>

            <section className="grid gap-4 md:grid-cols-3">
              {[
                { label: 'Demandes entrantes', value: queue.length, icon: Inbox },
                { label: 'Actions client', value: queue.filter((item) => item.blockers.length).length, icon: CalendarClock },
                { label: 'Sécurité', value: 'MFA', icon: ShieldCheck },
              ].map((item) => (
                <div key={item.label} className="rounded-md border border-border bg-white p-5 shadow-elevation-sm">
                  <item.icon className="mb-4 h-6 w-6 text-primary" />
                  <p className="text-sm font-semibold text-muted-foreground">{item.label}</p>
                  <p className="mt-1 text-3xl font-extrabold">{item.value}</p>
                </div>
              ))}
            </section>

            <section className="rounded-md border border-border bg-white shadow-elevation-sm">
              <div className="border-b border-border p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-md bg-secondary text-primary">
                    <MessageSquareText className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-extrabold">Fil partagé{currentDossier ? ` : ${currentDossier.name}` : ''}</h2>
                    <p className="text-sm text-muted-foreground">Visible par le client, l’équipe Greffio et les intervenants autorisés.</p>
                  </div>
                </div>
              </div>
              <div className="space-y-4 p-5">
                {messages.length ? messages.map((item) => (
                  <div key={item.id} className={`max-w-[82%] rounded-md p-4 ${item.from === 'client' ? 'ml-auto bg-[hsl(var(--greffio-blue))] text-white' : 'bg-muted text-foreground'}`}>
                    <div className="mb-2 flex items-center justify-between gap-4 text-xs font-bold opacity-80">
                      <span>{item.author || 'Message'}</span>
                      <span>{new Date(item.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <p className="text-sm leading-6">{item.text}</p>
                  </div>
                )) : (
                  <div className="rounded-md bg-muted p-5 text-sm leading-6 text-muted-foreground">
                    Aucun message pour le moment. Le fil se remplira avec les échanges réels entre le client, l’équipe Greffio et les partenaires autorisés.
                  </div>
                )}
              </div>
              <div className="flex gap-3 border-t border-border p-5">
                <Input value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Écrire un message, demander une pièce, assigner une action..." />
                <Button>
                  <Send className="h-4 w-4" />
                  Envoyer
                </Button>
              </div>
            </section>

            <section className="grid gap-4 md:grid-cols-3">
              {workstreams.map((member) => (
                <div key={member.name} className="rounded-md border border-border bg-white p-5 shadow-elevation-sm">
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-md bg-secondary text-primary">
                    <Users className="h-5 w-5" />
                  </div>
                  <h3 className="font-extrabold">{member.name}</h3>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">{member.role}</p>
                  <div className="mt-4 text-xs font-bold">
                    <span className="rounded-full bg-emerald-100 px-2 py-1 text-emerald-700">{member.status}</span>
                  </div>
                </div>
              ))}
            </section>
          </section>

          <aside className="space-y-6">
            <section className="rounded-md border border-border bg-white p-5 shadow-elevation-sm">
              <div className="mb-4 flex items-center gap-2">
                <CalendarClock className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-extrabold">Back-office équipe</h2>
              </div>
              <div className="space-y-3">
                {queue.length ? queue.map((dossier) => (
                  <div key={dossier.id} className="rounded-md border border-border p-3">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <p className="text-sm font-bold">{dossier.name}</p>
                      <StatusBadge status={dossier.status} />
                    </div>
                    <p className="text-xs text-muted-foreground">{dossier.nextAction}</p>
                    <div className="mt-3 flex items-center justify-between text-xs font-bold">
                      <span className="text-primary">{dossier.ownerLabel}</span>
                      <span>{dossier.progress || 0}%</span>
                    </div>
                  </div>
                )) : (
                  <div className="rounded-md bg-muted p-4 text-sm leading-6 text-muted-foreground">Aucun dossier ouvert dans cet espace.</div>
                )}
              </div>
            </section>

            <section className="rounded-md bg-[hsl(var(--greffio-blue))] p-5 text-white shadow-elevation-md">
              <CheckCircle2 className="mb-4 h-6 w-6 text-[hsl(var(--greffio-citron))]" />
              <h2 className="text-lg font-extrabold">Traçabilité</h2>
              <p className="mt-2 text-sm leading-6 text-white/78">Chaque échange peut devenir une tâche, une demande de pièce, une note interne ou une validation rattachée au dossier.</p>
            </section>
          </aside>
        </div>
      </main>
    </div>
  );
};
