import React from 'react';
import { OpsFilteredDossiersPage } from '@/pages/ops/OpsFilteredDossiersPage.jsx';

export const OpsRelancesPage = () => (
  <OpsFilteredDossiersPage
    title="Relances client"
    description="Dossiers où une relance ou un rappel pièces est recommandé par le moteur anti-rejet."
    filterFn={(item) => ['reminder', 'missing_docs'].includes(item.nextBestAction?.type)}
    emptyMessage="Aucune relance suggérée pour le moment."
  />
);
