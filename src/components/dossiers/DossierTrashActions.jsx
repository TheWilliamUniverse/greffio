import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { purgePlaceholderDossiers } from '@/api/dossiers.js';
import { isEphemeralPlaceholderDossier } from '@/utils/dossierBootstrap.js';
import { Button } from '@/components/ui/button.jsx';
import { ConfirmActionDialog } from '@/components/ConfirmActionDialog.jsx';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/hooks/queries/queryKeys.js';

export const DossierTrashActions = ({
  dossier,
  className = '',
  compact = false,
  onTrashed,
}) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  if (!dossier?.id || !isEphemeralPlaceholderDossier(dossier)) return null;

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ['dossiers'] });
    await queryClient.invalidateQueries({ queryKey: queryKeys.trashedDossiers() });
    if (dossier.id) {
      await queryClient.invalidateQueries({ queryKey: queryKeys.dossier(dossier.id) });
    }
  };

  const handlePurgeAll = async () => {
    setConfirmOpen(false);
    setBusy(true);
    try {
      const result = await purgePlaceholderDossiers();
      toast.success(result?.message || 'Brouillons supprimés.');
      await invalidate();
      onTrashed?.();
      navigate('/dossiers');
    } catch (_error) {
      toast.error('Impossible de nettoyer les brouillons.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={`rounded-2xl border border-red-200 bg-red-50/50 p-4 ${className}`}>
      <p className="text-sm font-bold text-red-900">Brouillon non entamé</p>
      <p className="mt-1 text-sm leading-relaxed text-red-900/80">
        Ce dossier n’a pas encore été complété. Vous pouvez le retirer de votre liste sans impact sur une formalité en cours.
      </p>
      <div className={`mt-3 ${compact ? '' : 'sm:flex-row'}`}>
        <Button
          type="button"
          variant="ghost"
          disabled={busy}
          className={`text-red-700 hover:bg-red-100/60 ${compact ? 'h-11 w-full justify-start rounded-2xl' : ''}`}
          onClick={() => setConfirmOpen(true)}
        >
          <Trash2 className="h-4 w-4" />
          Nettoyer tous les brouillons vides
        </Button>
      </div>
      <ConfirmActionDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        destructive
        loading={busy}
        title="Supprimer les brouillons vides ?"
        description="Les brouillons non entamés, comme « Projet Greffio », seront retirés de votre liste. Vos vrais dossiers ne sont pas concernés."
        confirmLabel="Nettoyer les brouillons"
        onConfirm={() => { void handlePurgeAll(); }}
      />
    </div>
  );
};
