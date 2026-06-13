import React, { useEffect, useState } from 'react';
import { CalendarClock, CheckCircle2, Inbox, MessageSquareText, ShieldCheck, UserPlus } from 'lucide-react';
import { Sidebar } from '@/components/Sidebar.jsx';
import { Button } from '@/components/ui/button.jsx';
import { DossierMessageThread } from '@/components/messaging/DossierMessageThread.jsx';
import { useAuth } from '@/hooks/useAuth.js';
import { listDossiers } from '@/api/dossiers.js';
import { fetchDossierMessages, postDossierMessage } from '@/api/dossierMessages.js';
import { useDossierMessagesRealtime, sendDossierMessageOptimistic } from '@/hooks/useDossierMessagesRealtime.js';

const workstreams = [
  { name: 'Équipe formalités Greffio', role: 'Contrôle statuts, formulaires, bénéficiaires effectifs', status: 'Activable' },
  { name: 'Partenaires tiers', role: 'Banque, annonce légale, dépôt et relances', status: 'Sur dossier' },
  { name: 'Support client Greffio', role: 'Questions, pièces, accès et paiements', status: 'Disponible' },
];

export const TeamPage = () => {
  const { currentUser } = useAuth();
  const [queue, setQueue] = useState([]);
  const [selectedDossierId, setSelectedDossierId] = useState(null);

  const {
    messages,
    setMessages,
    loading: messagesLoading,
  } = useDossierMessagesRealtime(selectedDossierId, fetchDossierMessages, {
    enabled: Boolean(selectedDossierId),
  });

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const payload = await listDossiers();
        const dossiers = Array.isArray(payload?.dossiers) ? payload.dossiers : [];
        if (!mounted) return;
        setQueue(dossiers.map((item) => ({
          id: item.id,
          name: item.companyName || item.denomination || 'Dossier',
          status: item.status,
          progress: Number(item.progressPercent || 0),
        })));
        setSelectedDossierId((current) => current || dossiers[0]?.id || null);
      } catch (_error) {
        if (!mounted) return;
        setQueue([]);
      }
    };
    void load();
    return () => { mounted = false; };
  }, []);

  const currentDossier = queue.find((item) => item.id === selectedDossierId) || queue[0];
  const clientDisplayName = [currentUser?.firstName, currentUser?.lastName].filter(Boolean).join(' ').trim() || 'Vous';

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
              <Button disabled title="Fonctionnalité à venir – contactez le support Greffio pour inviter un intervenant.">
                <UserPlus className="h-4 w-4" />
                Inviter un intervenant
              </Button>
            </div>

            <section className="grid gap-4 md:grid-cols-3">
              {[
                { label: 'Demandes entrantes', value: queue.length, icon: Inbox },
                { label: 'Actions client', value: queue.filter((item) => item.progress < 100).length, icon: CalendarClock },
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
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-md bg-secondary text-primary">
                      <MessageSquareText className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="text-lg font-extrabold">
                        Fil partagé{currentDossier ? ` : ${currentDossier.name}` : ''}
                      </h2>
                      <p className="text-sm text-muted-foreground">Visible par le client et l’équipe Greffio.</p>
                    </div>
                  </div>
                  {queue.length > 1 ? (
                    <select
                      className="h-10 rounded-md border border-border bg-white px-3 text-sm"
                      value={selectedDossierId || ''}
                      onChange={(event) => setSelectedDossierId(event.target.value)}
                    >
                      {queue.map((item) => (
                        <option key={item.id} value={item.id}>{item.name}</option>
                      ))}
                    </select>
                  ) : null}
                </div>
              </div>
              <div className="p-5">
                {currentDossier ? (
                  <DossierMessageThread
                    messages={messages}
                    loading={messagesLoading}
                    onSend={async (body) => {
                      await sendDossierMessageOptimistic({
                        dossierId: selectedDossierId || currentDossier.id,
                        body,
                        setMessages,
                        postMessage: postDossierMessage,
                        authorType: 'client',
                        authorName: clientDisplayName,
                      });
                    }}
                  />
                ) : (
                  <div className="rounded-md bg-muted p-5 text-sm text-muted-foreground">
                    Ouvrez un dossier pour échanger avec l’équipe Greffio.
                  </div>
                )}
              </div>
            </section>

            <section className="grid gap-4 md:grid-cols-3">
              {workstreams.map((member) => (
                <div key={member.name} className="rounded-md border border-border bg-white p-5 shadow-elevation-sm">
                  <CheckCircle2 className="mb-4 h-6 w-6 text-emerald-600" />
                  <p className="font-extrabold">{member.name}</p>
                  <p className="mt-2 text-sm text-muted-foreground">{member.role}</p>
                  <p className="mt-3 text-xs font-bold uppercase text-primary">{member.status}</p>
                </div>
              ))}
            </section>
          </section>
        </div>
      </main>
    </div>
  );
};
