import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ExternalLink, FileText, Mail, PenLine } from 'lucide-react';
import { toast } from 'sonner';
import { Sidebar } from '@/components/Sidebar.jsx';
import { PdfPreviewPanel } from '@/components/documents/PdfPreviewPanel.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { SignatureAdoptPanel } from '@/components/signature/SignatureAdoptPanel.jsx';
import { downloadDossierDocument, previewDossierDocumentPdf } from '@/api/documents.js';
import {
  loadNonConvictionEditor,
  saveNonConvictionDraft,
  sendNonConvictionSignatureRequest,
  signNonConvictionNow,
} from '@/api/nonConviction.js';
import { runtimeConfig } from '@/config/runtime.js';
import { getDocumentEditorLoadErrorMessage } from '@/utils/documentEditorErrors.js';
import { handleSignNowApiResponse } from '@/utils/signwellClient.js';
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
  const [fields, setFields] = useState(null);
  const [loadStatus, setLoadStatus] = useState('loading');
  const [loadError, setLoadError] = useState('');
  const [previewKey, setPreviewKey] = useState(0);
  const [previewBlobUrl, setPreviewBlobUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [signMode, setSignMode] = useState(null);
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
      const result = await signNonConvictionNow(dossierId, {
        fields: normalized,
        ...signaturePayload,
        previewAcknowledged: true,
      });
      if (handleSignNowApiResponse(result) === 'redirect') {
        toast.info('Ouverture de la signature sécurisée SignWell…');
        return;
      }
      toast.success('Signature enregistrée. Votre document est maintenant enregistré dans le dossier.');
      void triggerMobileHaptic('success');
      setSignMode(null);
      try {
        const { blob } = await downloadDossierDocument({
          dossierId,
          docKey: 'manager_non_conviction',
          cacheBust: true,
        });
        setPreviewBlobUrl((current) => {
          if (current) URL.revokeObjectURL(current);
          return URL.createObjectURL(blob);
        });
        setPreviewKey((k) => k + 1);
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
    } catch (error) {
      const offline = typeof navigator !== 'undefined' && !navigator.onLine;
      toast.error(offline
        ? 'Signature non enregistrée. Vérifiez votre connexion puis réessayez.'
        : mapError(error));
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
              <section className="rounded-2xl border border-border/70 bg-white p-4 shadow-sm">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label>Prénom(s)</Label>
                    <Input className="mt-1" value={fields.declarantFirstName || ''} onChange={(e) => updateField('declarantFirstName', e.target.value)} />
                  </div>
                  <div>
                <Label>Nom de naissance</Label>
                <Input
                  className="mt-1"
                  value={fields.declarantBirthName || fields.declarantLastName || ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    setFields((current) => ({
                      ...current,
                      declarantBirthName: value,
                      declarantLastName: value,
                    }));
                  }}
                />
              </div>
              <div className="sm:col-span-2">
                <Label>Nom d&apos;usage, le cas échéant</Label>
                <Input
                  className="mt-1"
                  value={fields.declarantUsageName || ''}
                  onChange={(e) => updateField('declarantUsageName', e.target.value)}
                  placeholder="Laisser vide si aucun nom d’usage"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Le nom de naissance figure sur l&apos;acte de naissance. Le nom d&apos;usage est facultatif.
                </p>
              </div>
              <div>
                <Label>Date de naissance</Label>
                <Input type="date" className="mt-1" value={fields.declarantBirthDate || ''} onChange={(e) => updateField('declarantBirthDate', e.target.value)} />
              </div>
              <div>
                <Label>Lieu de naissance</Label>
                <Input className="mt-1" value={fields.declarantBirthCity || ''} onChange={(e) => updateField('declarantBirthCity', e.target.value)} />
              </div>
              <div className="sm:col-span-2">
                <Label>Adresse</Label>
                <Input className="mt-1" value={fields.addressLine1 || ''} onChange={(e) => updateField('addressLine1', e.target.value)} />
              </div>
              <div>
                <Label>Code postal</Label>
                <Input className="mt-1" value={fields.postalCode || ''} onChange={(e) => updateField('postalCode', e.target.value)} />
              </div>
              <div>
                <Label>Ville</Label>
                <Input className="mt-1" value={fields.city || ''} onChange={(e) => updateField('city', e.target.value)} />
              </div>
              <div className="sm:col-span-2">
                <Label>Père — nom et prénom(s)</Label>
                <Input className="mt-1" value={fields.parent1FullName || ''} onChange={(e) => updateField('parent1FullName', e.target.value)} />
              </div>
              <div>
                <Label>Parent 2 — prénom(s)</Label>
                <Input className="mt-1" value={fields.parent2FirstNames || ''} onChange={(e) => updateField('parent2FirstNames', e.target.value)} />
              </div>
              <div>
                <Label>Parent 2 — nom de naissance</Label>
                <Input className="mt-1" value={fields.parent2BirthName || ''} onChange={(e) => updateField('parent2BirthName', e.target.value)} />
              </div>
              <div className="sm:col-span-2">
                <Label>Parent 2 — nom d&apos;usage, le cas échéant</Label>
                <Input
                  className="mt-1"
                  value={fields.parent2UsageName || ''}
                  onChange={(e) => updateField('parent2UsageName', e.target.value)}
                  placeholder="Laisser vide si aucun nom d’usage"
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
              <div className="sm:col-span-2">
                <Label>Nom du signataire (tel qu&apos;il apparaîtra sur le PDF)</Label>
                <Input
                  className="mt-1"
                  value={fields.signatureFullName || ''}
                  onChange={(e) => updateField('signatureFullName', e.target.value)}
                />
              </div>
            </div>

            <div className="mt-5 space-y-3 rounded-xl border border-[var(--we-border)] bg-[#fafcff] p-4">
              <p className="text-xs font-bold uppercase text-primary">Attestations obligatoires</p>
              <label className="flex items-start gap-3 text-sm">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={Boolean(fields.declarationNonCondamnation)}
                  onChange={(e) => updateField('declarationNonCondamnation', e.target.checked)}
                />
                <span>
                  Je déclare sur l&apos;honneur ne pas faire l&apos;objet d&apos;une condamnation incompatible avec la gestion
                  d&apos;une entreprise (article L. 123-5 du code de commerce).
                </span>
              </label>
              <label className="flex items-start gap-3 text-sm">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={Boolean(fields.declarationFiliation)}
                  onChange={(e) => updateField('declarationFiliation', e.target.checked)}
                />
                <span>
                  Je déclare sur l&apos;honneur l&apos;exactitude des renseignements relatifs à ma filiation (père et mère).
                </span>
              </label>
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
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div>
                  <Label>Prénom(s)</Label>
                  <Input className="mt-1" value={fields.declarantFirstName || ''} onChange={(e) => updateField('declarantFirstName', e.target.value)} />
                </div>
                <div>
                  <Label>Nom de naissance</Label>
                  <Input
                    className="mt-1"
                    value={fields.declarantBirthName || fields.declarantLastName || ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      setFields((current) => ({
                        ...current,
                        declarantBirthName: value,
                        declarantLastName: value,
                      }));
                    }}
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label>Nom d&apos;usage, le cas échéant</Label>
                  <Input
                    className="mt-1"
                    value={fields.declarantUsageName || ''}
                    onChange={(e) => updateField('declarantUsageName', e.target.value)}
                    placeholder="Laisser vide si aucun nom d’usage"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Le nom de naissance figure sur l&apos;acte de naissance. Le nom d&apos;usage est facultatif.
                  </p>
                </div>
                <div>
                  <Label>Date de naissance</Label>
                  <Input type="date" className="mt-1" value={fields.declarantBirthDate || ''} onChange={(e) => updateField('declarantBirthDate', e.target.value)} />
                </div>
                <div>
                  <Label>Lieu de naissance</Label>
                  <Input className="mt-1" value={fields.declarantBirthCity || ''} onChange={(e) => updateField('declarantBirthCity', e.target.value)} />
                </div>
                <div className="sm:col-span-2">
                  <Label>Adresse</Label>
                  <Input className="mt-1" value={fields.addressLine1 || ''} onChange={(e) => updateField('addressLine1', e.target.value)} />
                </div>
                <div>
                  <Label>Code postal</Label>
                  <Input className="mt-1" value={fields.postalCode || ''} onChange={(e) => updateField('postalCode', e.target.value)} />
                </div>
                <div>
                  <Label>Ville</Label>
                  <Input className="mt-1" value={fields.city || ''} onChange={(e) => updateField('city', e.target.value)} />
                </div>
                <div className="sm:col-span-2">
                  <Label>Père — nom et prénom(s)</Label>
                  <Input className="mt-1" value={fields.parent1FullName || ''} onChange={(e) => updateField('parent1FullName', e.target.value)} />
                </div>
                <div>
                  <Label>Parent 2 — prénom(s)</Label>
                  <Input className="mt-1" value={fields.parent2FirstNames || ''} onChange={(e) => updateField('parent2FirstNames', e.target.value)} />
                </div>
                <div>
                  <Label>Parent 2 — nom de naissance</Label>
                  <Input className="mt-1" value={fields.parent2BirthName || ''} onChange={(e) => updateField('parent2BirthName', e.target.value)} />
                </div>
                <div className="sm:col-span-2">
                  <Label>Parent 2 — nom d&apos;usage, le cas échéant</Label>
                  <Input
                    className="mt-1"
                    value={fields.parent2UsageName || ''}
                    onChange={(e) => updateField('parent2UsageName', e.target.value)}
                    placeholder="Laisser vide si aucun nom d’usage"
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
                <div className="sm:col-span-2">
                  <Label>Nom du signataire (tel qu&apos;il apparaîtra sur le PDF)</Label>
                  <Input
                    className="mt-1"
                    value={fields.signatureFullName || ''}
                    onChange={(e) => updateField('signatureFullName', e.target.value)}
                  />
                </div>
              </div>

              <div className="mt-5 space-y-3 rounded-xl border border-[var(--we-border)] bg-[#fafcff] p-4">
                <p className="text-xs font-bold uppercase text-primary">Attestations obligatoires</p>
                <label className="flex items-start gap-3 text-sm">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={Boolean(fields.declarationNonCondamnation)}
                    onChange={(e) => updateField('declarationNonCondamnation', e.target.checked)}
                  />
                  <span>
                    Je déclare sur l&apos;honneur ne pas faire l&apos;objet d&apos;une condamnation incompatible avec la gestion
                    d&apos;une entreprise (article L. 123-5 du code de commerce).
                  </span>
                </label>
                <label className="flex items-start gap-3 text-sm">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={Boolean(fields.declarationFiliation)}
                    onChange={(e) => updateField('declarationFiliation', e.target.checked)}
                  />
                  <span>
                    Je déclare sur l&apos;honneur l&apos;exactitude des renseignements relatifs à ma filiation (père et mère).
                  </span>
                </label>
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
              filename="Declaration_non_condamnation.pdf"
            />
          </div>
        )}

        <MobileSignatureOverlay
          open={Boolean(signMode)}
          footerHint={signMode === 'email'
            ? `Un email sera envoyé avec un lien sécurisé (${runtimeConfig.appUrl || 'Greffio'}).`
            : ''}
        >
          <SignatureAdoptPanel
            defaultName={fields.signatureFullName || [fields.declarantFirstName, fields.declarantBirthName || fields.declarantLastName].filter(Boolean).join(' ')}
            defaultEmail={fields.signerEmail || fields.email || ''}
            loading={saving}
            onCancel={() => setSignMode(null)}
            onConfirm={(payload) => {
              if (signMode === 'email') {
                void onSendEmail(payload);
              } else {
                void onSignNow(payload);
              }
            }}
          />
        </MobileSignatureOverlay>
      </main>
    </div>
  );
};
