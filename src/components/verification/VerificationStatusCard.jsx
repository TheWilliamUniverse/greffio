import React from 'react';
import { ShieldCheck, AlertTriangle } from 'lucide-react';
import { RiskBadge } from '@/components/verification/RiskBadge.jsx';

const COMPANY_STATUS_LABELS = {
  CHECKED: 'Identifiée',
  NOT_CHECKED: 'En cours de vérification',
};

export const VerificationStatusCard = ({
  profile,
  onRun,
  running = false,
  internalView = false,
}) => {
  if (!profile) {
    return (
      <div className="rounded-2xl border border-border bg-white p-5">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 text-primary" />
          <div>
            <h3 className="font-extrabold">Vérifications du dossier</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Analyse automatique de cohérence (SIREN, adresse, complétude). Ce n&apos;est pas une certification juridique.
            </p>
            {onRun ? (
              <button
                type="button"
                onClick={onRun}
                disabled={running}
                className="mt-4 rounded-full bg-primary px-4 py-2 text-sm font-bold text-primary-foreground disabled:opacity-50"
              >
                {running ? 'Analyse en cours…' : 'Lancer les vérifications'}
              </button>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  const companyLabel = COMPANY_STATUS_LABELS[profile.company_status] || profile.company_status || '–';

  return (
    <div className="rounded-2xl border border-border bg-white p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {profile.risk_level === 'LOW' || profile.risk_level === 'MEDIUM'
            ? <ShieldCheck className="h-5 w-5 text-emerald-600" />
            : <AlertTriangle className="h-5 w-5 text-amber-600" />}
          <h3 className="font-extrabold">Vérifications du dossier</h3>
        </div>
        {internalView ? <RiskBadge level={profile.risk_level} /> : null}
      </div>
      <dl className={`mt-4 grid gap-2 text-sm ${internalView ? 'sm:grid-cols-2' : ''}`}>
        <div>
          <dt className="text-muted-foreground">Complétude</dt>
          <dd className="font-semibold">{Math.round(Number(profile.completeness_score || 0))}%</dd>
        </div>
        {internalView ? (
          <div>
            <dt className="text-muted-foreground">Entreprise</dt>
            <dd className="font-semibold">{companyLabel}</dd>
          </div>
        ) : null}
      </dl>
      <p className="mt-3 text-xs text-muted-foreground">
        Pré-vérification Greffio uniquement. Les formalités officielles restent soumises aux organismes compétents.
      </p>
      {internalView && onRun ? (
        <button
          type="button"
          onClick={onRun}
          disabled={running}
          className="mt-4 text-sm font-semibold text-primary hover:underline disabled:opacity-50"
        >
          {running ? 'Actualisation…' : 'Relancer les vérifications'}
        </button>
      ) : null}
    </div>
  );
};
