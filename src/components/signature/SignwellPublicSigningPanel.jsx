import React from 'react';
import { ExternalLink, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';

export const SignwellPublicSigningPanel = ({
  signerFullName,
  signerEmail,
  signingUrl,
  previewAcknowledged,
  onContinue,
  loading = false,
  errorMessage = '',
}) => (
  <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#111827] p-6 text-white shadow-xl">
    <div className="flex items-center gap-2 text-emerald-300">
      <ShieldCheck className="size-5" aria-hidden />
      <p className="text-sm font-semibold uppercase tracking-wide">Signature sécurisée SignWell</p>
    </div>
    <h2 className="mt-3 text-xl font-bold">Finaliser sur SignWell</h2>
    <p className="mt-2 text-sm leading-relaxed text-white/70">
      Greffio prépare le document. La signature électronique est réalisée sur l’interface SignWell
      (prestataire tiers), puis le dossier est mis à jour automatiquement.
    </p>
    <dl className="mt-5 space-y-2 rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm">
      <div>
        <dt className="text-white/50">Signataire</dt>
        <dd className="font-medium">{signerFullName || '–'}</dd>
      </div>
      <div>
        <dt className="text-white/50">Email</dt>
        <dd className="font-medium break-all">{signerEmail || '–'}</dd>
      </div>
    </dl>
    {errorMessage ? (
      <p className="mt-4 rounded-lg border border-red-400/40 bg-red-950/40 p-3 text-sm text-red-200">
        {errorMessage}
      </p>
    ) : null}
    <Button
      type="button"
      className="mt-6 w-full gap-2"
      disabled={loading || !previewAcknowledged || !signingUrl}
      onClick={onContinue}
    >
      <ExternalLink className="size-4" aria-hidden />
      {loading ? 'Redirection…' : 'Continuer vers la signature sécurisée'}
    </Button>
    {!previewAcknowledged ? (
      <p className="mt-3 text-center text-xs text-amber-200/90">
        Cochez la confirmation de lecture du document à gauche pour continuer.
      </p>
    ) : null}
  </div>
);
