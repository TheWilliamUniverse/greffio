import React from 'react';
import { OpsFilteredDossiersPage } from '@/pages/ops/OpsFilteredDossiersPage.jsx';

export const OpsDepotPage = () => (
  <OpsFilteredDossiersPage
    title="Dépôt guichet unique"
    description="Dossiers prêts au dépôt après contrôle documentaire, mandat et paiement."
    filterFn={(item) => Boolean(item.readyForDeposit)}
    emptyMessage="Aucun dossier prêt au dépôt."
  />
);
