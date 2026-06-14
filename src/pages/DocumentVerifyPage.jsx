import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { GreffioLogo } from '@/components/GreffioLogo.jsx';
import { Button } from '@/components/ui/button.jsx';
import { PublicPageLayout } from '@/components/layout/PublicPageLayout.jsx';

/** Page publique légère – vérification d'empreinte documentaire (QR procuration / pouvoirs). */
export const DocumentVerifyPage = () => {
  const { id } = useParams();
  const fingerprint = String(id || '').trim();

  return (
    <PublicPageLayout showFooter footer="marketing">
      <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-4 py-16 text-center">
        <GreffioLogo className="mb-6" />
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <ShieldCheck className="h-6 w-6" />
        </div>
        <h1 className="text-2xl font-extrabold text-[hsl(var(--greffio-blue-900))]">
          Vérification document Greffio
        </h1>
        {fingerprint ? (
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Empreinte recherchée : <span className="font-mono text-xs">{fingerprint}</span>
          </p>
        ) : null}
        <p className="mt-4 text-sm leading-7 text-muted-foreground">
          Cette page confirme qu&apos;un document a été émis via Greffio avec horodatage et empreinte SHA-256.
          Pour une vérification complète, contactez le support avec la référence de votre dossier.
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          Signature électronique simple (SES) – non qualifiée eIDAS.
        </p>
        <Button asChild className="mt-8">
          <Link to="/contact">Contacter le support</Link>
        </Button>
      </div>
    </PublicPageLayout>
  );
};
