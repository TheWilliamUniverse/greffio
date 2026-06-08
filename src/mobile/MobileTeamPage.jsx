import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Bot, Inbox, MessageSquareText } from 'lucide-react';
import { DossierMessageThread } from '@/components/messaging/DossierMessageThread.jsx';
import { MobileAnimatedSection } from '@/mobile/ui/MobileAnimatedSection.jsx';
import { MobilePageSkeleton } from '@/mobile/ui/MobilePageSkeleton.jsx';
import { MobilePageContainer } from '@/mobile/ui/MobilePageContainer.jsx';
import { MobileEmptyState } from '@/mobile/ui/MobileEmptyState.jsx';
import { useMobileMotion } from '@/mobile/ui/mobileMotion.js';
import { listDossiers } from '@/api/dossiers.js';
import { fetchDossierMessages } from '@/api/dossierMessages.js';
import { useDossierMessagesRealtime, sendDossierMessageOptimistic } from '@/hooks/useDossierMessagesRealtime.js';
import { QUESTIONNAIRE_NEW_PATH } from '@/utils/questionnaireNavigation.js';

export const MobileTeamPage = () => {
  const { staggerItem } = useMobileMotion();
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [selectedDossierId, setSelectedDossierId] = useState(null);
  const [filter, setFilter] = useState('Tous');

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
        setLoading(true);
        setLoadError(false);
        const payload = await listDossiers();
        const dossiers = Array.isArray(payload?.dossiers) ? payload.dossiers : [];
        if (!mounted) return;
        setQueue(dossiers.map((item) => ({
          id: item.id,
          name: item.companyName || item.denomination || 'Dossier',
          status: item.status,
        })));
        setSelectedDossierId((current) => current || dossiers[0]?.id || null);
      } catch (_error) {
        if (!mounted) return;
        setLoadError(true);
        setQueue([]);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    void load();
    return () => { mounted = false; };
  }, []);

  const currentDossier = queue.find((item) => item.id === selectedDossierId) || queue[0];

  if (loading) return <MobilePageSkeleton />;

  return (
    <MobilePageContainer>
      <MobileAnimatedSection>
        <p className="text-xs font-bold uppercase tracking-wide text-primary">Relation équipe-client</p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-[hsl(var(--greffio-blue-900))]">Messages</h1>
        <p className="mt-1 text-sm text-muted-foreground">Échanges liés à vos dossiers et formalités.</p>
      </MobileAnimatedSection>

      {loadError ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Impossible de charger vos conversations.
        </div>
      ) : null}

      {!queue.length && !loadError ? (
        <MobileAnimatedSection delay={0.05}>
          <MobileEmptyState
            icon={Inbox}
            title="Aucun message pour le moment"
            description="Vos échanges avec l’équipe Greffio apparaîtront ici dès qu’un dossier sera actif."
            actionLabel="Nouvelle formalité"
            actionTo={QUESTIONNAIRE_NEW_PATH}
            secondaryLabel="Ouvrir l’assistant"
            secondaryTo="/mobile/search"
          />
        </MobileAnimatedSection>
      ) : (
        <>
          <MobileAnimatedSection delay={0.04}>
            <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {['Tous', 'Dossiers', 'Support'].map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setFilter(item)}
                  className={`shrink-0 rounded-full px-4 py-2 text-xs font-bold transition ${
                    filter === item ? 'bg-[hsl(var(--greffio-blue))] text-white' : 'bg-white text-muted-foreground ring-1 ring-border'
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          </MobileAnimatedSection>

          {queue.length > 1 ? (
            <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {queue.map((item, index) => (
                <motion.button
                  key={item.id}
                  type="button"
                  {...staggerItem(index)}
                  onClick={() => setSelectedDossierId(item.id)}
                  className={`shrink-0 rounded-2xl border px-4 py-2 text-sm font-semibold transition ${
                    item.id === selectedDossierId
                      ? 'border-primary bg-secondary text-primary'
                      : 'border-border bg-white text-muted-foreground'
                  }`}
                >
                  {item.name}
                </motion.button>
              ))}
            </div>
          ) : null}

          <MobileAnimatedSection delay={0.08}>
            <div className="overflow-hidden rounded-3xl border border-border/70 bg-white shadow-sm">
              <div className="flex items-center gap-3 border-b border-border/70 p-4">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-secondary text-primary">
                  <MessageSquareText className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <h2 className="truncate text-base font-extrabold">
                    {currentDossier?.name || 'Fil de discussion'}
                  </h2>
                  <p className="text-xs text-muted-foreground">Visible par vous et l’équipe Greffio.</p>
                </div>
              </div>
              <div className="p-4">
                {currentDossier ? (
                  <DossierMessageThread
                    messages={messages}
                    loading={messagesLoading}
                    onSend={async (body) => {
                      await sendDossierMessageOptimistic({
                        dossierId: currentDossier.id,
                        body,
                        fetchMessages: fetchDossierMessages,
                        setMessages,
                      });
                    }}
                  />
                ) : null}
              </div>
            </div>
          </MobileAnimatedSection>
        </>
      )}
    </MobilePageContainer>
  );
};
