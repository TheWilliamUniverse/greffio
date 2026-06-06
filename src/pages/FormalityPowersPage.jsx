import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { FileText, Mail, PenLine } from 'lucide-react';
import { toast } from 'sonner';
import { Sidebar } from '@/components/Sidebar.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { SignatureAdoptPanel } from '@/components/signature/SignatureAdoptPanel.jsx';
import { downloadDossierDocument, previewDossierDocumentPdf } from '@/api/documents.js';
import {
  loadEditableDocumentEditor,
  saveEditableDocumentDraft,
  sendEditableDocumentSignatureRequest,
  signEditableDocumentNow,
} from '@/api/editableDocuments.js';
import { getDocumentEditorLoadErrorMessage } from '@/utils/documentEditorErrors.js';
import { DocumentEditorLoadGate } from '@/components/documents/DocumentEditorLoadGate.jsx';
import { runtimeConfig } from '@/config/runtime.js';

const DOC_KEY = 'formality_powers';

const mapError = (error) => {
  const code = error?.code || error?.message || '';
  const fieldMessages = {
    DOCUMENT_EDITOR_COMPANY_REQUIRED: 'Indiquez la dénomination sociale.',
    DOCUMENT_EDITOR_MANDATAIRE_REQUIRED: 'Indiquez le mandataire.',
    DOCUMENT_EDITOR_SIGNATURE_PLACE_DATE_REQUIRED: 'Indiquez le lieu et la date.',
    DOCUMENT_EDITOR_SIGNATURE_REQUIRED: 'Indiquez le nom du signataire.',
    SIGN_NOW_FAILED: 'La signature n’a pas pu être apposée sur le document.',
    PDF_GENERATION_FAILED: 'La génération du document a échoué.',
    STORAGE_UPLOAD_FAILED: 'Le document n’a pas pu être enregistré.',
  };
  return fieldMessages[code] || getDocumentEditorLoadErrorMessage(error);
};

export const FormalityPowersPage = () => {
  const { dossierId } = useParams();
  const [fields, setFields] = useState(null);
  const [loadStatus, setLoadStatus] = useState('loading');
  const [loadError, setLoadError] = useState('');
  const [previewBlobUrl, setPreviewBlobUrl] = useState('');
  const [previewKey, setPreviewKey] = useState(0);
  const [saving, setSaving] = useState(false);
  const [signMode, setSignMode] = useState(null);

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
      await saveEditableDocumentDraft(dossierId, DOC_KEY, fields);
      await signEditableDocumentNow(dossierId, DOC_KEY, { fields, ...signaturePayload });
      const { blob } = await downloadDossierDocument({ dossierId, docKey: DOC_KEY, cacheBust: true, inline: true });
      setPreviewBlobUrl((current) => {
        if (current) URL.revokeObjectURL(current);
        return URL.createObjectURL(blob);
      });
      setPreviewKey((value) => value + 1);
      toast.success('Pouvoirs pour formalités signés.');
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
    <div className="flex min-h-[calc(100vh-4rem)] overflow-hidden bg-[var(--we-bg)]">
      <Sidebar />
      <main className="flex flex-1 flex-col overflow-hidden">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--we-border)] bg-white px-5 py-4">
          <div>
            <p className="text-sm font-bold uppercase text-primary">Annexe distincte des statuts</p>
            <h1 className="text-xl font-extrabold">Pouvoirs pour formalités</h1>
          </div>
          <Button variant="outline" className="bg-white" asChild>
            <Link to="/documents">Retour documents</Link>
          </Button>
        </header>

        <div className="grid flex-1 lg:grid-cols-2">
          <section className="overflow-y-auto border-r border-[var(--we-border)] bg-white p-5">
            <p className="text-sm text-muted-foreground">
              Document séparé des statuts — confère les pouvoirs au mandataire pour le dépôt guichet unique et les formalités d’immatriculation.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label>Société</Label>
                <Input className="mt-1" value={fields.companyName || ''} onChange={(e) => updateField('companyName', e.target.value)} />
              </div>
              <div>
                <Label>Forme juridique</Label>
                <Input className="mt-1" value={fields.legalForm || ''} onChange={(e) => updateField('legalForm', e.target.value)} />
              </div>
              <div>
                <Label>Greffe compétent</Label>
                <Input className="mt-1" value={fields.greffe || ''} onChange={(e) => updateField('greffe', e.target.value)} />
              </div>
              <div className="sm:col-span-2">
                <Label>Mandataire</Label>
                <Input className="mt-1" value={fields.mandataire || ''} onChange={(e) => updateField('mandataire', e.target.value)} />
              </div>
              <div>
                <Label>Fait à</Label>
                <Input className="mt-1" value={fields.statementCity || ''} onChange={(e) => updateField('statementCity', e.target.value)} />
              </div>
              <div>
                <Label>Le</Label>
                <Input type="date" className="mt-1" value={fields.statementDate || ''} onChange={(e) => updateField('statementDate', e.target.value)} />
              </div>
              <div>
                <Label>Signataire</Label>
                <Input className="mt-1" value={fields.signatoryName || fields.signatureFullName || ''} onChange={(e) => {
                  updateField('signatoryName', e.target.value);
                  updateField('signatureFullName', e.target.value);
                }} />
              </div>
              <div>
                <Label>Qualité</Label>
                <Input className="mt-1" value={fields.signatoryTitle || ''} onChange={(e) => updateField('signatoryTitle', e.target.value)} />
              </div>
            </div>

            <div className="mt-6 rounded-xl border border-[var(--we-border)] bg-[#fafcff] p-4 text-sm leading-6 text-muted-foreground">
              {(fields.paragraphs || []).map((paragraph) => (
                <p key={paragraph.slice(0, 40)} className="mb-2 last:mb-0">{paragraph}</p>
              ))}
            </div>

            <div className="sticky bottom-0 mt-6 flex flex-wrap gap-2 border-t border-[var(--we-border)] bg-white pt-4">
              <Button onClick={() => void onGeneratePreview()} disabled={saving}>
                <FileText className="h-4 w-4" />
                {saving ? 'Génération…' : 'Générer l’aperçu'}
              </Button>
              <Button variant="outline" className="bg-white" onClick={() => setSignMode('immediate')}>
                <PenLine className="h-4 w-4" />
                Signer maintenant
              </Button>
              <Button variant="outline" className="bg-white" onClick={() => setSignMode('email')}>
                <Mail className="h-4 w-4" />
                Envoyer pour signature
              </Button>
            </div>
          </section>

          <section className="flex flex-col bg-[#1e293b]">
            <div className="border-b border-white/10 px-4 py-3 text-sm font-semibold text-white">Prévisualisation PDF</div>
            {previewKey > 0 && previewBlobUrl ? (
              <iframe title="Aperçu pouvoirs formalités" src={previewBlobUrl} className="min-h-0 flex-1 w-full bg-[#334155]" />
            ) : (
              <div className="flex flex-1 items-center justify-center p-8 text-center text-sm text-white/70">
                Générez l’aperçu pour afficher le document ici.
              </div>
            )}
          </section>
        </div>

        {signMode ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="w-full max-w-lg">
              <SignatureAdoptPanel
                defaultName={fields.signatureFullName || fields.signatoryName || ''}
                defaultEmail={fields.signerEmail || ''}
                loading={saving}
                onCancel={() => setSignMode(null)}
                onConfirm={(payload) => {
                  if (signMode === 'email') void onSendEmail(payload);
                  else void onSignNow(payload);
                }}
              />
              {signMode === 'email' ? (
                <p className="mt-2 text-center text-xs text-white/80">
                  Lien sécurisé via {runtimeConfig.appUrl || 'Greffio'}.
                </p>
              ) : null}
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
};
