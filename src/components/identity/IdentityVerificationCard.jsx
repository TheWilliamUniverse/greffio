import React, { useEffect, useState } from 'react';
import { ExternalLink, Fingerprint, RefreshCw, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import {
  getIdentityVerificationStatus,
  refreshIdentityVerification,
  startIdentityVerification,
} from '@/api/identity.js';

const STATUS_LABELS = {
  not_started: 'Non démarrée',
  session_created: 'Session créée',
  pending_user: 'En attente de votre action',
  under_review: 'En cours de revue',
  approved: 'Identité validée',
  declined: 'Identité refusée',
  expired: 'Session expirée',
};

export const IdentityVerificationCard = ({ dossierId, identityDocUploaded = false, onVerificationUpdated }) => {
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [configured, setConfigured] = useState(false);
  const [verification, setVerification] = useState(null);
  const [error, setError] = useState('');

  const loadStatus = async () => {
    if (!dossierId) return;
    try {
      setLoading(true);
      setError('');
      const payload = await getIdentityVerificationStatus(dossierId);
      setConfigured(Boolean(payload.configured));
      setVerification(payload.verification || null);
      onVerificationUpdated?.(payload.verification || null);
    } catch (statusError) {
      setError('Impossible de charger le statut de vérification d’identité.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadStatus();
  }, [dossierId]);

  const handleStart = async () => {
    if (!dossierId) return;
    try {
      setRunning(true);
      setError('');
      const payload = await startIdentityVerification(dossierId);
      setVerification(payload.verification || null);
      onVerificationUpdated?.(payload.verification || null);
    } catch (startError) {
      setError('La vérification Didit n’a pas pu démarrer. Réessayez ou contactez l’équipe Greffio.');
    } finally {
      setRunning(false);
    }
  };

  const handleRefresh = async () => {
    if (!dossierId) return;
    try {
      setRunning(true);
      setError('');
      const payload = await refreshIdentityVerification(dossierId);
      setVerification(payload.verification || null);
      onVerificationUpdated?.(payload.verification || null);
    } catch (_refreshError) {
      setError('Impossible d’actualiser le statut pour le moment.');
    } finally {
      setRunning(false);
    }
  };

  if (!identityDocUploaded) {
    return (
      <div className="rounded-2xl border border-border bg-white p-5">
        <div className="flex items-start gap-3">
          <Fingerprint className="mt-0.5 h-5 w-5 text-primary" />
          <div>
            <h3 className="font-extrabold">Vérification d’identité (Didit)</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Déposez d’abord votre pièce d’identité (PDF). Greffio pourra ensuite lancer une vérification sécurisée via Didit.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 text-primary" />
          <div>
            <h3 className="font-extrabold">Vérification d’identité (Didit)</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Après dépôt de la pièce d’identité, complétez la vérification biométrique Didit (OCR, liveness, face match).
              Ce n’est pas une certification juridique.
            </p>
          </div>
        </div>
        {verification?.status ? (
          <span className="rounded-full bg-secondary px-3 py-1 text-xs font-bold text-primary">
            {STATUS_LABELS[verification.status] || verification.status}
          </span>
        ) : null}
      </div>

      {loading ? (
        <p className="mt-4 text-sm text-muted-foreground">Chargement…</p>
      ) : null}

      {!configured ? (
        <p className="mt-4 text-sm text-amber-700">
          Vérification Didit en cours d’activation côté serveur. Votre pièce est bien enregistrée.
        </p>
      ) : null}

      {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}

      <div className="mt-4 flex flex-wrap gap-2">
        {!verification?.verificationUrl ? (
          <Button type="button" onClick={() => void handleStart()} disabled={running || !configured}>
            {running ? 'Préparation…' : 'Lancer la vérification Didit'}
          </Button>
        ) : (
          <Button asChild type="button">
            <a href={verification.verificationUrl} target="_blank" rel="noopener noreferrer">
              Continuer sur Didit
              <ExternalLink className="h-4 w-4" />
            </a>
          </Button>
        )}
        {verification ? (
          <Button type="button" variant="outline" onClick={() => void handleRefresh()} disabled={running}>
            <RefreshCw className="h-4 w-4" />
            Actualiser
          </Button>
        ) : null}
      </div>
    </div>
  );
};
