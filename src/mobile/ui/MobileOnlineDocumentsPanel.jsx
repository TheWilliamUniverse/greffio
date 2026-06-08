import React from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, FilePlus2, FileSignature, PenLine, Users } from 'lucide-react';
import { StatusBadge } from '@/components/StatusBadge.jsx';
import { MobileAnimatedSection } from '@/mobile/ui/MobileAnimatedSection.jsx';
import { resolveOnlineDocumentState } from '@/utils/onlineDocumentStatus.js';

const ONLINE_DOCS = [
  {
    key: 'non_conviction',
    label: 'Non-condamnation',
    hint: 'Remplissage auto + signature',
    to: (dossierId) => `/dossier/${dossierId}/declaration-non-condamnation`,
    icon: PenLine,
  },
  {
    key: 'subscribers',
    label: 'Liste des souscripteurs',
    hint: 'Formulaire en ligne + PDF',
    to: (dossierId) => `/dossier/${dossierId}/liste-souscripteurs`,
    icon: Users,
  },
  {
    key: 'powers',
    label: 'Pouvoirs formalités',
    hint: 'Mandat et signature',
    to: (dossierId) => `/dossier/${dossierId}/pouvoirs-formalites`,
    icon: FileSignature,
  },
];

export const MobileOnlineDocumentsPanel = ({
  dossierId,
  documents = [],
  eiLike = false,
  delay = 0.07,
}) => {
  if (!dossierId || eiLike) return null;

  return (
    <MobileAnimatedSection delay={delay}>
      <div className="rounded-3xl border border-border/70 bg-white p-4 shadow-sm">
        <div className="flex items-start gap-3">
          <FilePlus2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <div>
            <h2 className="text-sm font-extrabold">Documents en ligne</h2>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Remplissage automatique depuis votre dossier et signature intégrée.
            </p>
          </div>
        </div>
        <div className="mt-4 space-y-2">
          {ONLINE_DOCS.map((item) => {
            const state = resolveOnlineDocumentState(item.key, documents, item.hint);
            return (
              <Link
                key={item.key}
                to={item.to(dossierId)}
                className="flex min-h-[56px] items-center gap-3 rounded-2xl border border-border/70 bg-background px-3 py-3 transition active:scale-[0.99]"
              >
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${state.isComplete ? 'bg-green-100' : 'bg-secondary'}`}>
                  {state.isComplete
                    ? <CheckCircle2 className="h-4 w-4 text-green-700" />
                    : <item.icon className="h-4 w-4 text-primary" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold text-foreground">{item.label}</span>
                  <span className="block text-xs text-muted-foreground">{state.hint}</span>
                </span>
                <StatusBadge status={state.status} className="shrink-0 text-[10px]" showGlossary={false} />
              </Link>
            );
          })}
        </div>
      </div>
    </MobileAnimatedSection>
  );
};
