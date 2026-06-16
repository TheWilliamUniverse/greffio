import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { trashDossier } from '@/api/dossiers.js';
import { isEphemeralPlaceholderDossier } from '@/utils/dossierBootstrap.js';
import { Button } from '@/components/ui/button.jsx';
import { ConfirmActionDialog } from '@/components/ConfirmActionDialog.jsx';
import { queryKeys } from '@/hooks/queries/queryKeys.js';

export const DossierDeleteAction = ({
  dossier,
  className = '',
  compact = false,
  onTrashed,
}) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  if (!dossier?.id) return null;

  const isPlaceholder = isEphemeralPlaceholderDossier(dossier);

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ['dossiers'] });
    await queryClient.invalidateQueries({ queryKey: queryKeys.trashedDossiers() });
    await queryClient.invalidateQueries({ queryKey: queryKeys.dossier(dossier.id) });
  };

  const handleTrash = async () => {
    setConfirmOpen(false);
    setBusy(true);
    try {
      await trashDossier(dossier.id);
      toast.success(isPlaceholder ? 'Brouillon placé en corbeille.' : 'Dossier placé en corbeille.');
      await invalidate();
      onTrashed?.();
      navigate(isPlaceholder ? '/dossiers' : '/dossiers?trash=1');
    } catch (_error) {
      toast.error('Impossible de supprimer ce dossier pour le moment.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={`rounded-2xl border border-red-200/90 bg-red-50/40 p-4 ${className}`}>
      <p className="text-sm font-extrabold text-red-900">
        {isPlaceholder ? 'Supprimer ce brouillon' : 'Supprimer ce dossier'}
      </p>
      <p className="mt-1.5 text-sm leading-relaxed text-red-900/80">
        {isPlaceholder
          ? 'Ce dossier n’a pas encore été complété. Retirez-le de votre liste sans impact sur une formalité en cours.'
          : 'Le dossier sera placé en corbeille puis supprimé définitivement sous 72 h. Vous pourrez l’annuler depuis la corbeille pendant ce délai.'}
      </p>
      <Button
        type="button"
        variant="outline"
        disabled={busy}
        className={`mt-3 border-red-300 bg-white text-red-700 hover:bg-red-50 ${compact ? 'h-11 w-full rounded-2xl' : ''}`}
        onClick={() => setConfirmOpen(true)}
      >
        <Trash2 className="h-4 w-4" />
        {isPlaceholder ? 'Supprimer ce brouillon' : 'Mettre en corbeille'}
      </Button>
      <ConfirmActionDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        destructive
        loading={busy}
        title={isPlaceholder ? 'Supprimer ce brouillon ?' : 'Mettre ce dossier en corbeille ?'}
        description={isPlaceholder
          ? 'Il sera placé en corbeille et restera récupérable pendant 72 h.'
          : 'Le dossier sera placé en corbeille puis supprimé définitivement sous 72 h, sauf annulation depuis la corbeille.'}
        confirmLabel={isPlaceholder ? 'Supprimer le brouillon' : 'Mettre en corbeille'}
        onConfirm={() => { void handleTrash(); }}
      />
    </div>
  );
};
