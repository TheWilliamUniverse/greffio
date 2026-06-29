import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ExternalLink, FileText, Mail, PenLine, RefreshCw } from 'lucide-react';
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
  loadNonConvictionEditor,
  saveNonConvictionDraft,
  sendNonConvictionSignatureRequest,
  signNonConvictionNow,
} from '@/api/nonConviction.js';
import { runtimeConfig } from '@/config/runtime.js';
import { buildSignedDocumentResult } from '@/utils/signedDocumentResult.js';
import { downloadSignedDocument } from '@/utils/signedDocumentDownload.js';
import { getDocumentEditorLoadErrorMessage } from '@/utils/documentEditorErrors.js';
import { NonConvictionEditorForm } from '@/components/documents/NonConvictionEditorForm.jsx';
import { DocumentEditorLoadGate } from '@/components/documents/DocumentEditorLoadGate.jsx';
import { MobileStickyFormActions } from '@/mobile/ui/MobileStickyFormActions.jsx';
import { MobileSignatureOverlay } from '@/mobile/ui/MobileSignatureOverlay.jsx';
import { MobileSignableDocumentShell } from '@/mobile/ui/MobileSignableDocumentShell.jsx';
import { useMobileSignatureOverlay } from '@/mobile/hooks/useMobileSignatureOverlay.js';
import { isCapacitorNative } from '@/utils/platform.js';
import { triggerMobileHaptic } from '@/utils/mobileHaptics.js';
import { cn } from '@/lib/utils.js';

const OFFICIAL_SIMULATOR = 'https://www.service-public.gouv.fr/simulateur/calcul/DeclarationDeNonCondamnationEtDeFiliation';

const mapError = (error) => getDocumentEditorLoadErrorMessage(error);

const normalizeFields = (fields = {}) => {
  const signatureFullName = String(fields.signatureFullName || '').trim()
    || [fields.declarantFirstName, fields.declarantBirthName || fields.declarantLastName].filter(Boolean).join(' ').trim();
  const parent2FullName = [fields.parent2FirstNames, fields.parent2BirthName].filter(Boolean).join(' ').trim()
    || fields.parent2FullName
    || '';
  return {
    ...fields,
    declarantBirthName: fields.declarantBirthName || fields.declarantLastName || '',
    parent2FullName,
    signatureFullName,
    declarationNonCondamnation: fields.declarationNonCondamnation !== false,
    declarationFiliation: fields.declarationFiliation !== false,
  };
};

export const NonConvictionDeclarationPage = () => {
  const { dossierId } = useParams();
  const navigate = useNavigate();
  const [fields, setFields] = useState(null);
  const [loadStatus, setLoadStatus] = useState('loading');
  const [loadError, setLoadError] = useState('');
  const [previewKey, setPreviewKey] = useState(0);
  const [previewBlobUrl, setPreviewBlobUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [signMode, setSignMode] = useState(null);
  const [signedResult, setSignedResult] = useState(null);
  const [signatureDispatch, setSignatureDispatch] = useState(null);
  const nativeApp = isCapacitorNative();

  useMobileSignatureOverlay(Boolean(signMode), () => setSignMode(null));

  useEffect(() => {
    if (!dossierId) {
      setLoadStatus('error');
      setLoadError('Aucun dossier sélectionné.');
      return undefined;
    }
    let cancelled = false;
    const boot = async () => {
      setLoadStatus('loading');
      setLoadError('');
      try {
        const payload = await loadNonConvictionEditor(dossierId);
        if (cancelled) return;
        setFields(normalizeFields(payload.fields || {}));
        setSignatureDispatch(payload.signatureDispatch || null);
        setLoadStatus('ready');
      } catch (error) {
        if (cancelled) return;
        const message = mapError(error);
        setLoadError(message);
        setLoadStatus('error');
      }
    };
    void boot();
    return () => {
      cancelled = true;
    };
  }, [dossierId]);

  const updateField = (key, value) => {
    setFields((current) => ({ ...current, [key]: value }));
  };

  useEffect(() => () => {
    if (previewBlobUrl) URL.revokeObjectURL(previewBlobUrl);
  }, [previewBlobUrl]);

  const onGeneratePreview = async () => {
    setSaving(true);
    try {
      const normalized = normalizeFields(fields);
      setFields(normalized);
      await saveNonConvictionDraft(dossierId, normalized);
      const blob = await previewDossierDocumentPdf({
        dossierId,
        docKey: 'manager_non_conviction',
        fields: normalized,
      });
      setPreviewBlobUrl((current) => {
        if (current) URL.revokeObjectURL(current);
        return URL.createObjectURL(blob);
      });
      setPreviewKey((k) => k + 1);
      toast.success('Aperçu PDF généré.');
    } catch (error) {
      const offline = typeof navigator !== 'undefined' && !navigator.onLine;
      toast.error(offline
        ? 'Signature non enregistrée. Vérifiez votre connexion puis réessayez.'
        : mapError(error));
    } finally {
      setSaving(false);
    }
  };

  const onSignNow = async (signaturePayload) => {
    setSaving(true);
    try {
      const normalized = normalizeFields(fields);
      setFields(normalized);
      if (previewKey === 0) {
        await saveNonConvictionDraft(dossierId, normalized);
        const blob = await previewDossierDocumentPdf({
          dossierId,
          docKey: 'manager_non_conviction',
          fields: normalized,
        });
        setPreviewBlobUrl((current) => {
          if (current) URL.revokeObjectURL(current);
          return URL.createObjectURL(blob);
        });
        setPreviewKey((k) => k + 1);
      }
      await saveNonConvictionDraft(dossierId, normalized);
      const signResult = await signNonConvictionNow(dossierId, {
        fields: normalized,
        ...signaturePayload,
        previewAcknowledged: true,
      });
      toast.success('Signature enregistrée. Votre document est maintenant enregistré dans le dossier.');
      void triggerMobileHaptic('success');
      setSignMode(null);
      try {
        const { blob } = await downloadDossierDocument({
          dossierId,
          docKey: 'manager_non_conviction',
          cacheBust: true,
          inline: true,
        });
        const nextBlobUrl = URL.createObjectURL(blob);
        setPreviewBlobUrl((current) => {
          if (current) URL.revokeObjectURL(current);
          return nextBlobUrl;
        });
        setPreviewKey((k) => k + 1);
        setSignedResult(buildSignedDocumentResult({
          apiResult: signResult,
          signaturePayload,
          documentLabel: 'Déclaration de non-condamnation et filiation',
          previewBlobUrl: nextBlobUrl,
          previewBlob: blob,
          previewFilename: 'Declaration_non_condamnation_signee.pdf',
        }));
      } catch (downloadError) {
        toast.warning(mapError(downloadError));
      }
    } catch (error) {
      const offline = typeof navigator !== 'undefined' && !navigator.onLine;
      toast.error(offline
        ? 'Signature non enregistrée. Vérifiez votre connexion puis réessayez.'
        : mapError(error));
    } finally {
      setSaving(false);
    }
  };

  const onSendEmail = async (signaturePayload) => {
    setSaving(true);
    try {
      await sendNonConvictionSignatureRequest(dossierId, {
        fields: normalizeFields(fields),
        signerEmail: signaturePayload.signerEmail,
        signerFullName: signaturePayload.signerFullName,
      });
      toast.success('Email de signature envoyé.');
      setSignMode(null);
      setSignatureDispatch({
        status: 'pending',
        signerEmail: signaturePayload.signerEmail,
        signerEmailMasked: signaturePayload.signerEmail,
        signerFullName: signaturePayload.signerFullName,
        canResend: true,
      });
    } catch (error) {
      const offline = typeof navigator !== 'undefined' && !navigator.onLine;
      toast.error(offline
        ? 'Signature non enregistrée. Vérifiez votre connexion puis réessayez.'
        : mapError(error));
    } finally {
      setSaving(false);
    }
  };

  const onResendSignatureLink = async () => {
    if (!signatureDispatch?.canResend) return;
    setSaving(true);
    try {
      const normalized = normalizeFields(fields);
      const signerEmail = signatureDispatch.signerEmail || normalized.signerEmail || normalized.email || '';
      const signerFullName = signatureDispatch.signerFullName || normalized.signatureFullName || '';
      await sendNonConvictionSignatureRequest(dossierId, {
        fields: normalized,
        signerEmail,
        signerFullName,
      });
      toast.success('Nouveau lien de signature envoyé.');
      setSignatureDispatch((current) => ({
        ...current,
        status: 'pending',
        canResend: true,
      }));
    } catch (error) {
      const offline = typeof navigator !== 'undefined' && !navigator.onLine;
      toast.error(offline
        ? 'Envoi impossible. Vérifiez votre connexion puis réessayez.'
        : mapError(error));
    } finally {
      setSaving(false);
    }
  };

  const signatureDispatchBanner = signatureDispatch?.canResend ? (
    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      <p>
        {signatureDispatch.status === 'expired'
          ? 'Le lien de signature a expiré.'
          : 'Une demande de signature est en attente.'}
        {signatureDispatch.signerEmailMasked ? ` Destinataire : ${signatureDispatch.signerEmailMasked}.` : ''}
      </p>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="mt-3 bg-white"
        disabled={saving}
        onClick={() => void onResendSignatureLink()}
      >
        <RefreshCw className={`h-4 w-4 ${saving ? 'animate-spin' : ''}`} />
        Renvoyer le lien
      </Button>
    </div>
  ) : null;

  if (loadStatus !== 'ready' || !fields) {
    return (
      <DocumentEditorLoadGate
        status={loadStatus}
        errorMessage={loadError}
        onRetry={() => {
          setLoadStatus('loading');
          void loadNonConvictionEditor(dossierId)
            .then((payload) => {
              setFields(normalizeFields(payload.fields || {}));
              setLoadStatus('ready');
            })
            .catch((error) => {
              const message = mapError(error);
              setLoadError(message);
              setLoadStatus('error');
            });
        }}
      />
    );
  }

  return (
    <div className={cn(!nativeApp && 'flex min-h-[calc(100vh-4rem)] overflow-hidden bg-[var(--we-bg)]')}>
      {!nativeApp && <Sidebar />}
      <main className={cn(!nativeApp && 'flex flex-1 flex-col overflow-hidden')}>
        {!nativeApp ? (
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--we-border)] bg-white px-5 py-4">
            <div>
              <p className="text-sm font-bold uppercase text-primary">Déclaration RCS / RNE</p>
              <h1 className="text-xl font-extrabold">Non-condamnation et filiation</h1>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" className="bg-white" asChild>
                <a href={OFFICIAL_SIMULATOR} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4" />
                  Simulateur Service-Public
                </a>
              </Button>
              <Button variant="outline" className="bg-white" asChild>
                <Link to="/documents">Retour documents</Link>
              </Button>
            </div>
          </header>
        ) : null}

        {nativeApp ? (
          <MobileSignableDocumentShell
            eyebrow="Déclaration RCS / RNE"
            title="Non-condamnation et filiation"
            intro="Complétez le formulaire conforme au modèle administratif. Vous pourrez vérifier le PDF avant signature."
          >
            <div className="space-y-4">
              {signatureDispatchBanner}
              <section className="rounded-2xl border border-border/70 bg-white p-4 shadow-sm">
                <NonConvictionEditorForm fields={fields} updateField={updateField} />

            <MobileStickyFormActions>
              <Button className="h-11 flex-1 sm:flex-none" onClick={() => void onGeneratePreview()} disabled={saving}>
                <FileText className="h-4 w-4" />
                {saving ? 'Génération…' : 'Générer l’aperçu'}
              </Button>
              <Button variant="outline" className="h-11 flex-1 bg-white sm:flex-none" onClick={() => setSignMode('immediate')}>
                <PenLine className="h-4 w-4" />
                Signer maintenant
              </Button>
              <Button variant="outline" className="h-11 flex-1 bg-white sm:flex-none" onClick={() => setSignMode('email')}>
                <Mail className="h-4 w-4" />
                Envoyer pour signature
              </Button>
            </MobileStickyFormActions>
              </section>

              <PdfPreviewPanel
                blobUrl={previewKey > 0 ? previewBlobUrl : ''}
                filename="Declaration_non_condamnation.pdf"
              />
            </div>
          </MobileSignableDocumentShell>
        ) : (
          <div className="grid flex-1 lg:grid-cols-2">
            <section className="overflow-y-auto border-r border-[var(--we-border)] bg-white p-5">
              <p className="text-sm text-muted-foreground">
                Complétez le formulaire conforme au modèle administratif. Vous pourrez vérifier le PDF avant signature.
              </p>
              {signatureDispatchBanner ? <div className="mt-4">{signatureDispatchBanner}</div> : null}
              <div className="mt-4">
                <NonConvictionEditorForm fields={fields} updateField={updateField} />
              </div>

              <GreffioSignatureActionBlock
                saving={saving}
                signMode={signMode}
                onGeneratePreview={onGeneratePreview}
                onSignModeChange={setSignMode}
                onSignConfirm={(mode, payload) => {
                  if (mode === 'email') void onSendEmail(payload);
                  else void onSignNow(payload);
                }}
                defaultSignerName={fields.signatureFullName || [fields.declarantFirstName, fields.declarantBirthName || fields.declarantLastName].filter(Boolean).join(' ')}
                defaultSignerEmail={fields.signerEmail || fields.email || ''}
              />
            </section>

            <PdfPreviewPanel
              blobUrl={previewKey > 0 ? previewBlobUrl : ''}
              filename="Declaration_non_condamnation.pdf"
            />
          </div>
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
              docKey="manager_non_conviction"
              onDownload={async () => {
                await downloadSignedDocument({
                  blob: signedResult.previewBlob,
                  filename: signedResult.previewFilename,
                  dossierId,
                  docKey: 'manager_non_conviction',
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
