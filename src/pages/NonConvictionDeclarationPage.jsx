import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ExternalLink, FileText, Mail, PenLine } from 'lucide-react';
import { toast } from 'sonner';
import { Sidebar } from '@/components/Sidebar.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { SignatureAdoptPanel } from '@/components/signature/SignatureAdoptPanel.jsx';
import { downloadDossierDocument } from '@/api/documents.js';
import {
  loadNonConvictionEditor,
  saveNonConvictionDraft,
  sendNonConvictionSignatureRequest,
  signNonConvictionNow,
} from '@/api/nonConviction.js';
import { runtimeConfig } from '@/config/runtime.js';

const OFFICIAL_SIMULATOR = 'https://www.service-public.gouv.fr/simulateur/calcul/DeclarationDeNonCondamnationEtDeFiliation';

export const NonConvictionDeclarationPage = () => {
  const { dossierId } = useParams();
  const [fields, setFields] = useState(null);
  const [previewKey, setPreviewKey] = useState(0);
  const [previewBlobUrl, setPreviewBlobUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [signMode, setSignMode] = useState(null);

  useEffect(() => {
    const boot = async () => {
      try {
        const payload = await loadNonConvictionEditor(dossierId);
        setFields(payload.fields || {});
      } catch (_error) {
        toast.error('Impossible de charger le formulaire.');
      }
    };
    void boot();
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
      await saveNonConvictionDraft(dossierId, fields);
      const blob = await downloadDossierDocument({
        dossierId,
        docKey: 'manager_non_conviction',
      });
      setPreviewBlobUrl((current) => {
        if (current) URL.revokeObjectURL(current);
        return URL.createObjectURL(blob);
      });
      setPreviewKey((k) => k + 1);
      toast.success('Aperçu PDF généré.');
    } catch (error) {
      toast.error(error?.message || 'Génération impossible.');
    } finally {
      setSaving(false);
    }
  };

  const onSignNow = async (signaturePayload) => {
    setSaving(true);
    try {
      await signNonConvictionNow(dossierId, { fields, ...signaturePayload });
      toast.success('Déclaration signée et archivée.');
      setSignMode(null);
    } catch (error) {
      toast.error(error?.message || 'Signature impossible.');
    } finally {
      setSaving(false);
    }
  };

  const onSendEmail = async (signaturePayload) => {
    setSaving(true);
    try {
      await sendNonConvictionSignatureRequest(dossierId, {
        fields,
        signerEmail: signaturePayload.signerEmail,
        signerFullName: signaturePayload.signerFullName,
      });
      toast.success('Email de signature envoyé.');
      setSignMode(null);
    } catch (error) {
      toast.error(error?.message || 'Envoi impossible.');
    } finally {
      setSaving(false);
    }
  };

  if (!fields) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] bg-[var(--we-bg)]">
        <Sidebar />
        <main className="flex flex-1 items-center justify-center p-8 text-muted-foreground">Chargement…</main>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)] overflow-hidden bg-[var(--we-bg)]">
      <Sidebar />
      <main className="flex flex-1 flex-col overflow-hidden">
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
                <Label>Nom</Label>
                <Input className="mt-1" value={fields.declarantLastName || ''} onChange={(e) => updateField('declarantLastName', e.target.value)} />
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
                <Label>Père (nom et prénom(s))</Label>
                <Input className="mt-1" value={fields.parent1FullName || ''} onChange={(e) => updateField('parent1FullName', e.target.value)} />
              </div>
              <div className="sm:col-span-2">
                <Label>Mère (nom de naissance et prénom(s))</Label>
                <Input className="mt-1" value={fields.parent2FullName || ''} onChange={(e) => updateField('parent2FullName', e.target.value)} />
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
            <div className="border-b border-white/10 px-4 py-3 text-sm font-semibold text-white">
              Prévisualisation PDF
            </div>
            {previewKey > 0 && previewBlobUrl ? (
              <iframe
                title="Aperçu déclaration"
                src={previewBlobUrl}
                className="min-h-0 flex-1 w-full bg-[#334155]"
              />
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
                defaultName={fields.signatureFullName || `${fields.declarantFirstName || ''} ${fields.declarantLastName || ''}`.trim()}
                defaultEmail={fields.signerEmail || ''}
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
              {signMode === 'email' ? (
                <p className="mt-2 text-center text-xs text-white/80">
                  Un email sera envoyé avec un lien sécurisé ({runtimeConfig.appUrl || 'Greffio'}).
                </p>
              ) : null}
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
};
