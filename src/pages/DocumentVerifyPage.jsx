import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Clock3, ShieldAlert, ShieldCheck, XCircle } from 'lucide-react';
import { StandalonePublicShell } from '@/components/layout/StandalonePublicShell.jsx';
import { Button } from '@/components/ui/button.jsx';
import { runtimeConfig } from '@/config/runtime.js';
import { getDocumentTypeLabel } from '@/utils/documentStatusLabels.js';
import { cn } from '@/lib/utils.js';

const formatFrenchDateTime = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString('fr-FR', {
    timeZone: 'Europe/Paris',
    dateStyle: 'long',
    timeStyle: 'short',
  });
};

const STATUS_CONFIG = {
  loading: {
    badge: 'Vérification…',
    badgeClass: 'bg-primary/10 text-primary',
    icon: Clock3,
    iconClass: 'bg-primary/10 text-primary',
    headline: 'Vérification en cours',
    description: 'Nous interrogeons le registre d\'intégrité Greffio.',
  },
  error: {
    badge: 'Indisponible',
    badgeClass: 'bg-slate-100 text-slate-700',
    icon: XCircle,
    iconClass: 'bg-slate-100 text-slate-600',
    headline: 'Service indisponible',
    description: 'Impossible de contacter le service de vérification pour le moment. Réessayez dans quelques instants.',
  },
  unverified: {
    badge: 'Non vérifié',
    badgeClass: 'bg-amber-50 text-amber-800',
    icon: ShieldAlert,
    iconClass: 'bg-amber-50 text-amber-700',
    headline: 'Vérification impossible',
    description: 'Ce lien ne permet pas de confirmer l\'authenticité du document. Utilisez le QR code ou le lien complet figurant sur le PDF signé Greffio.',
  },
  verified_ok: {
    badge: 'Authentique',
    badgeClass: 'bg-emerald-50 text-emerald-800',
    icon: CheckCircle2,
    iconClass: 'bg-emerald-50 text-emerald-700',
    headline: 'Document authentique',
    description: 'L\'empreinte SHA-256 du fichier correspond à celle enregistrée lors de la signature Greffio.',
  },
  verified_partial: {
    badge: 'Enregistré',
    badgeClass: 'bg-sky-50 text-sky-800',
    icon: ShieldCheck,
    iconClass: 'bg-sky-50 text-sky-700',
    headline: 'Document enregistré',
    description: 'Le document est connu de Greffio, mais l\'empreinte ne peut pas être confirmée automatiquement.',
  },
};

/** Page publique cachée – vérification d'intégrité documentaire (QR procuration / pouvoirs). */
export const DocumentVerifyPage = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const token = String(searchParams.get('token') || '').trim();
  const documentId = String(id || '').trim();
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const apiBase = runtimeConfig.apiBaseUrl || '';

  useEffect(() => {
    if (!documentId) {
      setLoading(false);
      return undefined;
    }

    const controller = new AbortController();
    const params = new URLSearchParams();
    if (token) params.set('token', token);
    const query = params.toString();
    const url = `${apiBase}/api/public/verify/document/${encodeURIComponent(documentId)}${query ? `?${query}` : ''}`;

    setLoading(true);
    setError(null);

    fetch(url, { signal: controller.signal })
      .then(async (response) => {
        const payload = await response.json().catch(() => null);
        if (!payload) {
          throw new Error('Réponse invalide');
        }
        setResult(payload);
      })
      .catch((fetchError) => {
        if (fetchError.name === 'AbortError') return;
        setError('Impossible de contacter le service de vérification.');
      })
      .finally(() => {
        setLoading(false);
      });

    return () => controller.abort();
  }, [apiBase, documentId, token]);

  const viewState = useMemo(() => {
    if (loading) return 'loading';
    if (error) return 'error';
    if (result?.verified && result?.hashMatch) return 'verified_ok';
    if (result?.verified) return 'verified_partial';
    return 'unverified';
  }, [error, loading, result]);

  const config = STATUS_CONFIG[viewState];
  const StatusIcon = config.icon;
  const documentTypeLabel = result?.documentLabel
    || getDocumentTypeLabel(result?.docKey, 'Document Greffio');

  return (
    <StandalonePublicShell contentClassName="flex min-h-[calc(100dvh-10rem)] flex-col items-center justify-center">
      <div
        className="w-full max-w-lg rounded-2xl border border-border/70 bg-white p-6 shadow-elevation-sm md:p-8"
        role="status"
        aria-live="polite"
        aria-busy={loading}
      >
        <div className="flex flex-col items-center text-center">
          <span className={cn('rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wide', config.badgeClass)}>
            {config.badge}
          </span>
          <div className={cn('mt-5 flex h-14 w-14 items-center justify-center rounded-2xl', config.iconClass)}>
            <StatusIcon className="h-7 w-7" aria-hidden="true" />
          </div>
          <h1 className="mt-5 text-2xl font-extrabold text-[hsl(var(--greffio-blue-900))]">
            {config.headline}
          </h1>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">
            {error || result?.message || config.description}
          </p>
        </div>

        {result?.verified ? (
          <div className="mt-6 rounded-xl border border-border/70 bg-[#fafcff] p-4 text-left text-sm">
            <p>
              <span className="font-semibold text-foreground">Type :</span>{' '}
              {documentTypeLabel}
            </p>
            {result.signerName ? (
              <p className="mt-2">
                <span className="font-semibold text-foreground">Signataire :</span>{' '}
                {result.signerName}
              </p>
            ) : null}
            {result.signedAt ? (
              <p className="mt-2">
                <span className="font-semibold text-foreground">Signé le :</span>{' '}
                {formatFrenchDateTime(result.signedAt)}
              </p>
            ) : null}
            <p className="mt-2">
              <span className="font-semibold text-foreground">Intégrité :</span>{' '}
              {result.hashMatch ? 'empreinte SHA-256 confirmée' : 'empreinte non confirmée'}
            </p>
            {result.documentHashAfterSignature ? (
              <p className="mt-3 break-all rounded-lg bg-white px-3 py-2 font-mono text-[11px] text-muted-foreground">
                SHA-256 : {result.documentHashAfterSignature}
              </p>
            ) : result.documentHashBeforeSignature ? (
              <p className="mt-3 break-all rounded-lg bg-white px-3 py-2 font-mono text-[11px] text-muted-foreground">
                SHA-256 (brouillon) : {result.documentHashBeforeSignature}
              </p>
            ) : null}
          </div>
        ) : null}

        <p className="mt-5 text-center text-[11px] leading-5 text-muted-foreground">
          Signature électronique simple (SES) – non qualifiée eIDAS.
        </p>

        <div className="mt-6 flex flex-col gap-3">
          <Button asChild variant={result?.verified ? 'outline' : 'default'} className="h-11 rounded-xl">
            <Link to="/contact">Contacter le support</Link>
          </Button>
        </div>
      </div>
    </StandalonePublicShell>
  );
};
