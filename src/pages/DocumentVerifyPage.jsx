import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { CheckCircle2, ShieldAlert, ShieldCheck, XCircle } from 'lucide-react';
import { GreffioLogo } from '@/components/GreffioLogo.jsx';
import { Button } from '@/components/ui/button.jsx';
import { PublicPageLayout } from '@/components/layout/PublicPageLayout.jsx';
import { runtimeConfig } from '@/config/runtime.js';

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

/** Page publique – vérification d'intégrité documentaire (QR procuration / pouvoirs). */
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

  const statusIcon = useMemo(() => {
    if (loading) return ShieldCheck;
    if (error || result?.status === 'not_found') return XCircle;
    if (result?.verified && result?.hashMatch) return CheckCircle2;
    if (result?.verified) return ShieldAlert;
    return ShieldCheck;
  }, [error, loading, result]);

  const StatusIcon = statusIcon;

  const headline = useMemo(() => {
    if (loading) return 'Vérification en cours…';
    if (error) return 'Service indisponible';
    if (result?.status === 'not_found') return 'Document introuvable';
    if (result?.status === 'invalid_token') return 'Jeton invalide';
    if (result?.verified && result?.hashMatch) return 'Document authentique';
    if (result?.verified) return 'Document enregistré';
    if (result?.status === 'found') return 'Document référencé';
    return 'Vérification document Greffio';
  }, [error, loading, result]);

  const description = useMemo(() => {
    if (loading) return 'Nous interrogeons le registre d\'intégrité Greffio.';
    if (error) return error;
    if (result?.message) return result.message;
    if (result?.verified && result?.hashMatch) {
      return 'L\'empreinte SHA-256 du fichier correspond à celle enregistrée lors de la signature.';
    }
    if (result?.verified) {
      return 'Le document est connu de Greffio, mais l\'empreinte ne peut pas être confirmée automatiquement.';
    }
    return 'Scannez le QR code du PDF ou ouvrez le lien complet avec le jeton de vérification.';
  }, [error, loading, result]);

  return (
    <PublicPageLayout showFooter footer="marketing">
      <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-4 py-16 text-center">
        <GreffioLogo className="mb-6" />
        <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl ${
          result?.verified && result?.hashMatch
            ? 'bg-emerald-500/10 text-emerald-700'
            : 'bg-primary/10 text-primary'
        }`}
        >
          <StatusIcon className="h-6 w-6" />
        </div>
        <h1 className="text-2xl font-extrabold text-[hsl(var(--greffio-blue-900))]">
          {headline}
        </h1>
        <p className="mt-4 text-sm leading-7 text-muted-foreground">
          {description}
        </p>

        {documentId ? (
          <p className="mt-3 text-xs text-muted-foreground">
            Référence document : <span className="font-mono">{documentId}</span>
          </p>
        ) : null}

        {result?.verified ? (
          <div className="mt-6 w-full rounded-xl border border-border/70 bg-muted/20 p-4 text-left text-sm">
            {result.documentLabel ? (
              <p><span className="font-semibold">Document :</span> {result.documentLabel}</p>
            ) : null}
            {result.signerName ? (
              <p className="mt-2"><span className="font-semibold">Signataire :</span> {result.signerName}</p>
            ) : null}
            {result.signedAt ? (
              <p className="mt-2">
                <span className="font-semibold">Date :</span> {formatFrenchDateTime(result.signedAt)}
              </p>
            ) : null}
            <p className="mt-2">
              <span className="font-semibold">Intégrité :</span>{' '}
              {result.hashMatch ? 'empreinte confirmée' : 'empreinte non confirmée'}
            </p>
            {result.documentHashAfterSignature ? (
              <p className="mt-2 break-all font-mono text-[11px] text-muted-foreground">
                SHA-256 : {result.documentHashAfterSignature}
              </p>
            ) : result.documentHashBeforeSignature ? (
              <p className="mt-2 break-all font-mono text-[11px] text-muted-foreground">
                SHA-256 (brouillon) : {result.documentHashBeforeSignature}
              </p>
            ) : null}
          </div>
        ) : null}

        <p className="mt-4 text-xs text-muted-foreground">
          Signature électronique simple (SES) – non qualifiée eIDAS.
        </p>
        <Button asChild className="mt-8" variant={result?.verified ? 'outline' : 'default'}>
          <Link to="/contact">Contacter le support</Link>
        </Button>
      </div>
    </PublicPageLayout>
  );
};
