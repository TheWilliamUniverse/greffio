import React from 'react';
import { FilePlus2, PenLine, Users, FileSignature } from 'lucide-react';
import { MobileAnimatedSection } from '@/mobile/ui/MobileAnimatedSection.jsx';
import { MobileDocumentCard } from '@/mobile/ui/MobileDocumentCard.jsx';
import { resolveOnlineDocumentState } from '@/utils/onlineDocumentStatus.js';
import { isDocumentPreviewAction } from '@/utils/dossierDocumentFile.js';

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
    label: 'Procuration et pouvoirs',
    hint: 'Compléter et signer en ligne',
    to: (dossierId) => `/dossier/${dossierId}/pouvoirs-formalites`,
    icon: FileSignature,
  },
];

export const MobileOnlineDocumentsPanel = ({
  dossierId,
  documents = [],
  eiLike = false,
  delay = 0.07,
  onDocumentAction,
  onDocumentPreview,
  previewLoadingDocKey = null,
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
        <div className="mt-4 space-y-3">
          {ONLINE_DOCS.map((item) => {
            const state = resolveOnlineDocumentState(item.key, documents, item.hint);
            const canPreview = state.hasFile && isDocumentPreviewAction(state.action);
            return (
              <MobileDocumentCard
                key={item.key}
                name={item.label}
                status={state.status}
                statusLabel={state.statusLabel}
                hint={state.hint}
                cta={state.cta}
                hasFile={state.hasFile}
                icon={item.icon}
                to={canPreview ? undefined : item.to(dossierId)}
                onAction={!canPreview && onDocumentAction ? () => onDocumentAction(item, state) : undefined}
                onPreview={canPreview && onDocumentPreview
                  ? () => onDocumentPreview({ docKey: state.docKey, label: item.label })
                  : undefined}
                previewLoading={previewLoadingDocKey === state.docKey}
                minHeight={false}
                className="rounded-2xl shadow-none"
              />
            );
          })}
        </div>
      </div>
    </MobileAnimatedSection>
  );
};
