import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { FileText } from 'lucide-react';
import { toast } from 'sonner';
import { Sidebar } from '@/components/Sidebar.jsx';
import { PdfPreviewPanel } from '@/components/documents/PdfPreviewPanel.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { GreffioSignatureActionBlock } from '@/components/signature/GreffioSignatureActionBlock.jsx';
import { SignedDocumentSuccessPanel } from '@/components/signature/SignedDocumentSuccessPanel.jsx';
import { downloadDossierDocument, previewDossierDocumentPdf } from '@/api/documents.js';
import {
  loadEditableDocumentEditor,
  saveEditableDocumentDraft,
  sendEditableDocumentSignatureRequest,
  signEditableDocumentNow,
} from '@/api/editableDocuments.js';
import { getDocumentEditorLoadErrorMessage } from '@/utils/documentEditorErrors.js';
import { DocumentEditorLoadGate } from '@/components/documents/DocumentEditorLoadGate.jsx';
import { MobileStickyFormActions } from '@/mobile/ui/MobileStickyFormActions.jsx';
import { MobileSignableDocumentShell } from '@/mobile/ui/MobileSignableDocumentShell.jsx';
import { useMobileSignatureOverlay } from '@/mobile/hooks/useMobileSignatureOverlay.js';
import { isCapacitorNative } from '@/utils/platform.js';
import { triggerMobileHaptic } from '@/utils/mobileHaptics.js';
import { cn } from '@/lib/utils.js';
import { runtimeConfig } from '@/config/runtime.js';
import { buildSignedDocumentResult } from '@/utils/signedDocumentResult.js';
import { downloadSignedDocument } from '@/utils/signedDocumentDownload.js';

const DOC_KEY = 'formality_powers';

const mapError = (error) => {
  const code = error?.code || error?.payload?.error || error?.message || '';
  const fieldMessages = {
    DOCUMENT_EDITOR_COMPANY_REQUIRED: 'Indiquez la dénomination sociale.',
    DOCUMENT_EDITOR_MANDATAIRE_REQUIRED: 'Indiquez le mandataire.',
    DOCUMENT_EDITOR_SIGNATURE_PLACE_DATE_REQUIRED: 'Indiquez le lieu et la date.',
    DOCUMENT_EDITOR_SIGNATURE_REQUIRED: 'Indiquez le nom du signataire.',
    DOCUMENT_EDITOR_LEGAL_ENTITY_REPRESENTATIVE_REQUIRED: 'Le représentant légal de la personne morale signataire est requis.',
    SIGN_NOW_FAILED: 'La signature n’a pas pu être apposée sur le document.',
    SIGNATURE_PREVIEW_REQUIRED: 'Consultez le document avant de le signer.',
    PDF_GENERATION_FAILED: 'La génération du document a échoué.',
    STORAGE_UPLOAD_FAILED: 'Le document n’a pas pu être enregistré.',
  };
  return fieldMessages[code] || error?.payload?.message || getDocumentEditorLoadErrorMessage(error);
};

export const FormalityPowersPage = () => {
  const { dossierId } = useParams();
  const navigate = useNavigate();
  const [fields, setFields] = useState(null);
  const [loadStatus, setLoadStatus] = useState('loading');
  const [loadError, setLoadError] = useState('');
  const [previewBlobUrl, setPreviewBlobUrl] = useState('');
  const [previewKey, setPreviewKey] = useState(0);
  const [saving, setSaving] = useState(false);
  const [signMode, setSignMode] = useState(null);
  const [signedResult, setSignedResult] = useState(null);
  const nativeApp = isCapacitorNative();

  useMobileSignatureOverlay(Boolean(signMode), () => setSignMode(null));

  useEffect(() => {
    if (!dossierId) {
      setLoadStatus('error');
      setLoadError('Aucun dossier sélectionné.');
      return undefined;
    }
    let cancelled = false;
    setLoadStatus('loading');
    void loadEditableDocumentEditor(dossierId, DOC_KEY)
      .then((payload) => {
        if (cancelled) return;
        setFields(payload.fields || {});
        setLoadStatus('ready');
      })
      .catch((error) => {
        if (cancelled) return;
        const message = mapError(error);
        setLoadError(message);
        setLoadStatus('error');
        toast.error(message);
      });
    return () => {
      cancelled = true;
    };
  }, [dossierId]);

  useEffect(() => () => {
    if (previewBlobUrl) URL.revokeObjectURL(previewBlobUrl);
  }, [previewBlobUrl]);

  const updateField = (key, value) => setFields((current) => ({ ...current, [key]: value }));

  const onGeneratePreview = async () => {
    setSaving(true);
    try {
      await saveEditableDocumentDraft(dossierId, DOC_KEY, fields);
      const blob = await previewDossierDocumentPdf({ dossierId, docKey: DOC_KEY, fields });
      setPreviewBlobUrl((current) => {
        if (current) URL.revokeObjectURL(current);
        return URL.createObjectURL(blob);
      });
      setPreviewKey((value) => value + 1);
      toast.success('Aperçu PDF généré.');
    } catch (error) {
      toast.error(mapError(error));
    } finally {
      setSaving(false);
    }
  };

  const onSignNow = async (signaturePayload) => {
    setSaving(true);
    try {
      if (previewKey === 0) {
        await saveEditableDocumentDraft(dossierId, DOC_KEY, fields);
        const blob = await previewDossierDocumentPdf({ dossierId, docKey: DOC_KEY, fields });
        setPreviewBlobUrl((current) => {
          if (current) URL.revokeObjectURL(current);
          return URL.createObjectURL(blob);
        });
        setPreviewKey((value) => value + 1);
      }
      await saveEditableDocumentDraft(dossierId, DOC_KEY, fields);
      const signResult = await signEditableDocumentNow(dossierId, DOC_KEY, {
        fields,
        ...signaturePayload,
        previewAcknowledged: true,
      });
      const { blob } = await downloadDossierDocument({ dossierId, docKey: DOC_KEY, cacheBust: true, inline: true });
      const nextBlobUrl = URL.createObjectURL(blob);
      setPreviewBlobUrl((current) => {
        if (current) URL.revokeObjectURL(current);
        return nextBlobUrl;
      });
      setPreviewKey((value) => value + 1);
      setSignedResult(buildSignedDocumentResult({
        apiResult: signResult,
        signaturePayload,
        documentLabel: 'Procuration et pouvoirs pour formalités',
        previewBlobUrl: nextBlobUrl,
        previewBlob: blob,
        previewFilename: 'Procuration_pouvoirs_formalites_signes.pdf',
      }));
      toast.success('Signature enregistrée. Votre document est maintenant enregistré dans le dossier.');
      void triggerMobileHaptic('success');
      setSignMode(null);
    } catch (error) {
      toast.error(mapError(error));
    } finally {
      setSaving(false);
    }
  };

  const onSendEmail = async (signaturePayload) => {
    setSaving(true);
    try {
      await sendEditableDocumentSignatureRequest(dossierId, DOC_KEY, { fields, ...signaturePayload });
      toast.success('Email de signature envoyé.');
      setSignMode(null);
    } catch (error) {
      toast.error(mapError(error));
    } finally {
      setSaving(false);
    }
  };

  if (loadStatus !== 'ready' || !fields) {
    return (
      <DocumentEditorLoadGate
        status={loadStatus}
        errorMessage={loadError}
        onRetry={() => {
          setLoadStatus('loading');
          void loadEditableDocumentEditor(dossierId, DOC_KEY)
            .then((payload) => {
              setFields(payload.fields || {});
              setLoadStatus('ready');
            })
            .catch((error) => {
              const message = mapError(error);
              setLoadError(message);
              setLoadStatus('error');
              toast.error(message);
            });
        }}
      />
    );
  }

  const formFields = (
    <>
      <div className="rounded-xl border border-[var(--we-border)] bg-[#fafcff] p-4 text-sm leading-6 text-muted-foreground">
        <p className="font-semibold text-foreground">{fields.companyName || 'Société'}</p>
        <p className="mt-1">{fields.legalForm || 'Forme juridique'} · Greffe de {fields.greffe || '–'}</p>
        <p className="mt-1">Mandataire : {fields.mandataire || 'WILLIAM ESTABLISHMENTS'}</p>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label>Mandant – prénom et nom</Label>
          <Input
            className="mt-1"
            value={fields.clientFullName || fields.signatoryName || ''}
            onChange={(e) => {
              const value = e.target.value;
              updateField('clientFullName', value);
              updateField('signatoryName', value);
              updateField('signatureFullName', value);
            }}
          />
        </div>
        <div>
          <Label>Date de naissance</Label>
          <Input type="date" className="mt-1" value={fields.clientBirthDate || ''} onChange={(e) => updateField('clientBirthDate', e.target.value)} />
        </div>
        <div>
          <Label>Lieu de naissance</Label>
          <Input className="mt-1" value={fields.clientBirthPlace || ''} onChange={(e) => updateField('clientBirthPlace', e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <Label>Adresse du mandant</Label>
          <Input className="mt-1" value={fields.clientAddress || ''} onChange={(e) => updateField('clientAddress', e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <Label>Qualité du signataire</Label>
          <Input
            className="mt-1"
            value={fields.signatoryTitle || ''}
            onChange={(e) => updateField('signatoryTitle', e.target.value)}
            placeholder="Président, gérant, associé fondateur…"
          />
        </div>
        <div>
          <Label>Fait à</Label>
          <Input className="mt-1" value={fields.statementCity || ''} onChange={(e) => updateField('statementCity', e.target.value)} />
        </div>
        <div>
          <Label>Le</Label>
          <Input type="date" className="mt-1" value={fields.statementDate || ''} onChange={(e) => updateField('statementDate', e.target.value)} />
        </div>
      </div>

      <p className="mt-4 text-xs leading-5 text-muted-foreground">
        Le PDF reprend intégralement le modèle juridique William Establishments. Vérifiez l&apos;aperçu avant signature.
      </p>
    </>
  );

  const signatureBlock = (
    <GreffioSignatureActionBlock
      saving={saving}
      signMode={signMode}
      onGeneratePreview={onGeneratePreview}
      onSignModeChange={setSignMode}
      onSignConfirm={(mode, payload) => {
        if (mode === 'email') void onSendEmail(payload);
        else void onSignNow(payload);
      }}
      defaultSignerName={fields.signatureFullName || fields.signatoryName || fields.clientFullName || ''}
      defaultSignerEmail={fields.signerEmail || ''}
      showInfoBanner={!nativeApp}
    />
  );

  return (
    <div className={cn(!nativeApp && 'flex min-h-[calc(100vh-4rem)] overflow-hidden bg-[var(--we-bg)]')}>
      {!nativeApp && <Sidebar />}
      <main className={cn(!nativeApp && 'flex flex-1 flex-col overflow-hidden', nativeApp && 'px-4 pb-2 pt-2')}>
        {nativeApp ? (
          <MobileSignableDocumentShell
            eyebrow="Procuration et pouvoirs"
            title="Procuration et pouvoirs pour formalités"
            intro="Modèle William Establishments – vérifiez le PDF avant signature."
          >
            <div className="space-y-4">
              <section className="rounded-2xl border border-border/70 bg-white p-4 shadow-sm">
                {formFields}
                <div className="mt-6">{signatureBlock}</div>
              </section>
              <PdfPreviewPanel
                blobUrl={previewKey > 0 ? previewBlobUrl : ''}
                filename="Pouvoirs_formalites.pdf"
              />
            </div>
          </MobileSignableDocumentShell>
        ) : (
          <>
            <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--we-border)] bg-white px-5 py-4">
              <div>
                <p className="text-sm font-bold uppercase text-primary">Procuration et pouvoirs</p>
                <h1 className="text-xl font-extrabold">Procuration et pouvoirs pour formalités</h1>
              </div>
              <Button variant="outline" className="bg-white" asChild>
                <Link to="/documents">Retour documents</Link>
              </Button>
            </header>
            <div className="grid flex-1 lg:grid-cols-2">
            <section className="overflow-y-auto border-r border-[var(--we-border)] bg-white p-5">
              <p className="text-sm text-muted-foreground">
                Document unique procuration et pouvoirs – formalités d&apos;immatriculation et guichet unique.
              </p>
              <div className="mt-4">
                {formFields}
                <div className="mt-6">{signatureBlock}</div>
              </div>
            </section>
            <PdfPreviewPanel
              blobUrl={previewKey > 0 ? previewBlobUrl : ''}
              filename="Pouvoirs_formalites.pdf"
            />
            </div>
          </>
        )}

        {signedResult ? (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-[#f6f8fc]/95 p-4 backdrop-blur-sm">
            <SignedDocumentSuccessPanel
              layout="page"
              documentLabel={signedResult.documentLabel}
              signerName={signedResult.signerName}
              signedAt={signedResult.signedAt}
              proofId={signedResult.proofId}
              verifyUrl={signedResult.verifyUrl}
              previewBlobUrl={signedResult.previewBlobUrl}
              previewBlob={signedResult.previewBlob}
              previewFilename={signedResult.previewFilename}
              dossierId={dossierId}
              docKey={DOC_KEY}
              onDownload={async () => {
                await downloadSignedDocument({
                  blob: signedResult.previewBlob,
                  filename: signedResult.previewFilename,
                  dossierId,
                  docKey: DOC_KEY,
                });
              }}
              onContinue={() => navigate(dossierId ? `/documents?dossierId=${encodeURIComponent(dossierId)}` : '/documents')}
              continueLabel="Continuer l'édition"
              validationNotchOnContinue
            />
          </div>
        ) : null}
      </main>
    </div>
  );
};
