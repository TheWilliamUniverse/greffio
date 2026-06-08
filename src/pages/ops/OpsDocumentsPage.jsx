import React from 'react';
import { OpsFilteredDossiersPage } from '@/pages/ops/OpsFilteredDossiersPage.jsx';

export const OpsDocumentsPage = () => (
  <OpsFilteredDossiersPage
    title="Documents à valider"
    description="Dossiers avec pièces déposées ou en cours de vérification. Ouvrez la fiche pour valider ou rejeter."
    filterFn={(item) => Number(item.pendingDocuments || 0) > 0}
    emptyMessage="Aucun document en attente de validation."
  />
);
