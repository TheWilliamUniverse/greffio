import React from 'react';
import { Link } from 'react-router-dom';
import { FolderKanban } from 'lucide-react';

export const DocumentCompletionDossierBanner = ({ dossier, dossierId, loading, error }) => {
  if (!dossierId) return null;

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-white px-4 py-3 text-sm text-muted-foreground">
        Chargement du contexte dossier…
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        {error} Vous pouvez continuer en mode autonome.
      </div>
    );
  }

  const label = dossier?.companyName || dossier?.reference || dossierId;

  return (
    <div className="rounded-xl border border-[#cfe0f5] bg-[#f8fbff] px-4 py-4">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <FolderKanban className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-wide text-primary">Dossier associé</p>
          <p className="mt-1 truncate text-base font-extrabold text-foreground">{label}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Le PDF complété pourra être rattaché à ce dossier après export.
          </p>
          <Link
            to={`/dossier/${encodeURIComponent(dossierId)}`}
            className="mt-2 inline-block text-sm font-semibold text-primary hover:underline"
          >
            Voir le dossier
          </Link>
        </div>
      </div>
    </div>
  );
};
