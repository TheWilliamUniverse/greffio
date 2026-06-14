import React, { useState } from 'react';
import { FileText, Mail, PenLine } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { GreffioSignatureInfoBanner } from '@/components/signature/GreffioSignatureInfoBanner.jsx';
import { SignatureAdoptPanel } from '@/components/signature/SignatureAdoptPanel.jsx';
import { MobileStickyFormActions } from '@/mobile/ui/MobileStickyFormActions.jsx';
import { MobileSignatureOverlay } from '@/mobile/ui/MobileSignatureOverlay.jsx';
import { runtimeConfig } from '@/config/runtime.js';

/** Bloc signature premium unifié (aperçu + signer / envoyer). */
export const GreffioSignatureActionBlock = ({
  previewReady = false,
  saving = false,
  signMode = null,
  onGeneratePreview,
  onSignModeChange,
  onSignConfirm,
  defaultSignerName = '',
  defaultSignerEmail = '',
  generateLabel = 'Générer l’aperçu',
  showInfoBanner = true,
  className = '',
}) => (
  <>
    {showInfoBanner ? <GreffioSignatureInfoBanner className={className} /> : null}
    <MobileStickyFormActions className={className ? `mt-4 ${className}` : 'mt-4'}>
      <Button
        type="button"
        className="h-11 flex-1 sm:flex-none"
        onClick={() => void onGeneratePreview?.()}
        disabled={saving}
      >
        <FileText className="h-4 w-4" />
        {saving && !signMode ? 'Génération…' : generateLabel}
      </Button>
      <Button
        type="button"
        variant="outline"
        className="h-11 flex-1 bg-white sm:flex-none"
        onClick={() => onSignModeChange?.('immediate')}
        disabled={saving}
      >
        <PenLine className="h-4 w-4" />
        Signer maintenant
      </Button>
      <Button
        type="button"
        variant="outline"
        className="h-11 flex-1 bg-white sm:flex-none"
        onClick={() => onSignModeChange?.('email')}
        disabled={saving}
      >
        <Mail className="h-4 w-4" />
        Envoyer pour signature
      </Button>
    </MobileStickyFormActions>

    <MobileSignatureOverlay
      open={Boolean(signMode)}
      footerHint={signMode === 'email'
        ? `Lien sécurisé via ${runtimeConfig.appUrl || 'Greffio'} (signature interne).`
        : ''}
    >
      <SignatureAdoptPanel
        defaultName={defaultSignerName}
        defaultEmail={defaultSignerEmail}
        subtitle="Signature électronique Greffio – horodatée et traçable (SES)"
        loading={saving}
        onCancel={() => onSignModeChange?.(null)}
        onConfirm={(payload) => void onSignConfirm?.(signMode, payload)}
      />
    </MobileSignatureOverlay>
  </>
);
