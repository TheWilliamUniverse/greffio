import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { FileText, Mail, PenLine } from 'lucide-react';
import { toast } from 'sonner';
import { Sidebar } from '@/components/Sidebar.jsx';
import { PdfPreviewPanel } from '@/components/documents/PdfPreviewPanel.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { SignatureAdoptPanel } from '@/components/signature/SignatureAdoptPanel.jsx';
import { GreffioSignatureInfoBanner } from '@/components/signature/GreffioSignatureInfoBanner.jsx';
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
import { MobileSignatureOverlay } from '@/mobile/ui/MobileSignatureOverlay.jsx';
import { MobileSignableDocumentHeader } from '@/mobile/ui/MobileSignableDocumentShell.jsx';
import { useMobileSignatureOverlay } from '@/mobile/hooks/useMobileSignatureOverlay.js';
import { isCapacitorNative } from '@/utils/platform.js';
import { triggerMobileHaptic } from '@/utils/mobileHaptics.js';
import { cn } from '@/lib/utils.js';
import { runtimeConfig } from '@/config/runtime.js';
import { buildSignedDocumentResult } from '@/utils/signedDocumentResult.js';
import { downloadSignedDocument } from '@/utils/signedDocumentDownload.js';

const DOC_KEY = 'subscribers_list';

const mapError = (error) => {
  const code = error?.code || error?.message || '';
  const fieldMessages = {
    DOCUMENT_EDITOR_COMPANY_REQUIRED: 'Indiquez la dénomination sociale.',
    DOCUMENT_EDITOR_SUBSCRIBERS_REQUIRED: 'Ajoutez au moins un souscripteur.',
    DOCUMENT_EDITOR_SUBSCRIBER_IDENTITY_REQUIRED: 'Chaque souscripteur doit avoir un nom.',
    DOCUMENT_EDITOR_SUBSCRIBER_BIRTH_REQUIRED: 'Chaque personne physique doit avoir une date et un lieu de naissance.',
    DOCUMENT_EDITOR_LEGAL_ENTITY_REPRESENTATIVE_REQUIRED: 'Chaque personne morale doit avoir un représentant légal signataire.',
    DOCUMENT_EDITOR_SIGNATURE_PLACE_DATE_REQUIRED: 'Indiquez le lieu et la date.',
    DOCUMENT_EDITOR_SIGNATURE_REQUIRED: 'Indiquez le nom du signataire (Président).',
    SIGN_NOW_FAILED: 'La signature n’a pas pu être apposée sur le document.',
    SIGNWELL_SIGN_NOW_FAILED: 'La signature n’a pas pu être finalisée. Réessayez ou contactez le support Greffio.',
    SIGNWELL_API_ERROR: 'La signature n’a pas pu être finalisée. Réessayez ou contactez le support Greffio.',
    SIGNWELL_SEND_FAILED: 'L’envoi du lien de signature a échoué. Réessayez ou contactez le support Greffio.',
    SIGNATURE_PREVIEW_REQUIRED: 'Consultez le document avant de le signer.',
    PDF_GENERATION_FAILED: 'La génération du document a échoué.',
    STORAGE_UPLOAD_FAILED: 'Le document n’a pas pu être enregistré.',
  };
  return fieldMessages[code] || getDocumentEditorLoadErrorMessage(error);
};

export const SubscribersListPage = () => {
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

  const updateSubscriber = (index, key, value) => {
    setFields((current) => {
      const subscribers = [...(current.subscribers || [])];
      subscribers[index] = { ...subscribers[index], [key]: value, sectionHeading: undefined };
      return { ...current, subscribers };
    });
  };

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
        documentLabel: 'Liste des souscripteurs',
        previewBlobUrl: nextBlobUrl,
        previewBlob: blob,
        previewFilename: 'Liste_souscripteurs_signee.pdf',
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

  return (
    <div className={cn(!nativeApp && 'flex min-h-[calc(100vh-4rem)] overflow-hidden bg-[var(--we-bg)]')}>
      {!nativeApp && <Sidebar />}
      <main className={cn(!nativeApp && 'flex flex-1 flex-col overflow-hidden', nativeApp && 'px-4 pb-2 pt-2')}>
        {nativeApp ? (
          <MobileSignableDocumentHeader
            eyebrow="Annexe statutaire"
            title="Liste des souscripteurs"
            intro="Modèle conforme au greffe – prérempli depuis votre dossier. Vérifiez chaque souscripteur avant signature par le Président."
          />
        ) : (
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--we-border)] bg-white px-5 py-4">
            <div>
              <p className="text-sm font-bold uppercase text-primary">Annexe statutaire</p>
              <h1 className="text-xl font-extrabold">Liste des souscripteurs</h1>
            </div>
            <Button variant="outline" className="bg-white" asChild>
              <Link to="/documents">Retour documents</Link>
            </Button>
          </header>
        )}

        <div className={cn('grid flex-1', !nativeApp && 'lg:grid-cols-2')}>
          <section className={cn('overflow-y-auto bg-white p-5', !nativeApp && 'border-r border-[var(--we-border)]')}>
            {!nativeApp ? (
              <p className="text-sm text-muted-foreground">
                Modèle conforme au greffe – prérempli depuis votre dossier. Vérifiez chaque souscripteur avant signature par le Président.
              </p>
            ) : null}
            {!nativeApp ? <GreffioSignatureInfoBanner className="mt-3" /> : null}
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label>Dénomination</Label>
                <Input className="mt-1" value={fields.companyName || ''} onChange={(e) => updateField('companyName', e.target.value)} />
              </div>
              <div className="sm:col-span-2">
                <Label>Forme juridique (en-tête)</Label>
                <Input className="mt-1" value={fields.legalFormHeader || ''} onChange={(e) => updateField('legalFormHeader', e.target.value)} />
              </div>
            </div>

            {(fields.subscribers || []).map((subscriber, index) => (
              <div key={`${subscriber.fullName}-${index}`} className="mt-6 rounded-xl border border-[var(--we-border)] p-4">
                <p className="text-sm font-extrabold">{subscriber.sectionHeading || `${subscriber.roleTitle} – ${subscriber.fullName}`}</p>
                {subscriber.isLegalEntity ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Personne morale – signataire : {subscriber.legalRepresentativeName || 'représentant à compléter'}
                    {subscriber.legalRepresentativeQuality ? ` (${subscriber.legalRepresentativeQuality})` : ''}
                  </p>
                ) : null}
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {(subscriber.isLegalEntity
                    ? [
                      ['roleTitle', 'Titre'],
                      ['fullName', 'Dénomination sociale'],
                      ['legalFormLabel', 'Forme juridique'],
                      ['siren', 'SIREN'],
                      ['address', 'Siège social'],
                      ['legalRepresentativeName', 'Représentant légal (signataire)'],
                      ['legalRepresentativeQuality', 'Qualité du représentant'],
                      ['titlesCount', `${fields.securitiesUnit || 'Actions'} souscrites`],
                      ['sharePercent', '% du capital'],
                      ['contributionCash', 'Apport en numéraire'],
                      ['contributionInKind', 'Apport en nature'],
                      ['liberationAmount', 'Montant libéré à la constitution'],
                    ]
                    : [
                      ['roleTitle', 'Titre'],
                      ['fullName', 'Nom et prénom'],
                      ['birthDatePlace', 'Date et lieu de naissance'],
                      ['nationality', 'Nationalité'],
                      ['address', 'Adresse'],
                      ['titlesCount', `${fields.securitiesUnit || 'Actions'} souscrites`],
                      ['sharePercent', '% du capital'],
                      ['contributionCash', 'Apport en numéraire'],
                      ['contributionInKind', 'Apport en nature'],
                      ['liberationAmount', 'Montant libéré à la constitution'],
                    ]
                  ).map(([key, label]) => (
                    <div key={key} className={['address', 'fullName', 'identitySummary'].includes(key) ? 'sm:col-span-2' : ''}>
                      <Label>{label}</Label>
                      <Input className="mt-1" value={subscriber[key] || ''} onChange={(e) => updateSubscriber(index, key, e.target.value)} />
                    </div>
                  ))}
                  <div className="sm:col-span-2">
                    <Label>Observations</Label>
                    <Input className="mt-1" value={subscriber.observations || ''} onChange={(e) => updateSubscriber(index, 'observations', e.target.value)} />
                  </div>
                </div>
              </div>
            ))}

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Fait à</Label>
                <Input className="mt-1" value={fields.statementCity || ''} onChange={(e) => updateField('statementCity', e.target.value)} />
              </div>
              <div>
                <Label>Le</Label>
                <Input type="date" className="mt-1" value={fields.statementDate || ''} onChange={(e) => updateField('statementDate', e.target.value)} />
              </div>
              <div className="sm:col-span-2">
                <Label>{fields.signatureIsLegalEntity ? 'Signataire (représentant légal)' : 'Président signataire'}</Label>
                <Input className="mt-1" value={fields.presidentName || fields.signatureFullName || ''} onChange={(e) => {
                  updateField('presidentName', e.target.value);
                  updateField('signatureFullName', e.target.value);
                  if (fields.signatureIsLegalEntity) {
                    updateField('signatureRepresentativeName', e.target.value);
                  }
                }} />
                {fields.signatureIsLegalEntity ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Pour {fields.signatureCompanyName || fields.companyName} – qualité : {fields.signatureRepresentativeQuality || 'à compléter'}
                  </p>
                ) : null}
              </div>
            </div>

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
            filename="Liste_souscripteurs.pdf"
          />
        </div>

        <MobileSignatureOverlay
          open={Boolean(signMode)}
          footerHint={signMode === 'email' ? `Lien sécurisé via ${runtimeConfig.appUrl || 'Greffio'}.` : ''}
        >
          <SignatureAdoptPanel
            defaultName={fields.signatureFullName || fields.presidentName || ''}
            defaultEmail={fields.signerEmail || ''}
            loading={saving}
            onCancel={() => setSignMode(null)}
            onConfirm={(payload) => {
              if (signMode === 'email') void onSendEmail(payload);
              else void onSignNow(payload);
            }}
          />
        </MobileSignatureOverlay>

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
