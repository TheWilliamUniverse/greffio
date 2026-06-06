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
import { getDeclarationErrorMessage } from '@/utils/declarationErrors.js';

const OFFICIAL_SIMULATOR = 'https://www.service-public.gouv.fr/simulateur/calcul/DeclarationDeNonCondamnationEtDeFiliation';

const mapError = (error) => getDeclarationErrorMessage(error?.code || error?.message, error?.payload);

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
  const [previewKey, setPreviewKey] = useState(0);
  const [previewBlobUrl, setPreviewBlobUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [signMode, setSignMode] = useState(null);

  useEffect(() => {
    const boot = async () => {
      try {
        const payload = await loadNonConvictionEditor(dossierId);
        setFields(normalizeFields(payload.fields || {}));
      } catch (error) {
        const code = String(error?.message || error?.payload?.error || '');
        if (code === 'AUTH_TOKEN_MISSING') {
          toast.error('Session expirée. Reconnectez-vous.');
        } else if (code === 'DOSSIER_FORBIDDEN' || error?.status === 403) {
          toast.error('Accès refusé à ce dossier.');
        } else if (code === 'DOCUMENT_EDITOR_LOAD_FAILED') {
          toast.error('Erreur serveur documents. Réessayez dans quelques instants.');
        } else {
          toast.error(mapError(error));
        }
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
      const normalized = normalizeFields(fields);
      setFields(normalized);
      await saveNonConvictionDraft(dossierId, normalized);
      const { blob } = await downloadDossierDocument({
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
      toast.error(mapError(error));
    } finally {
      setSaving(false);
    }
  };

  const onSignNow = async (signaturePayload) => {
    setSaving(true);
    try {
      await signNonConvictionNow(dossierId, { fields: normalizeFields(fields), ...signaturePayload });
      toast.success('Déclaration signée et archivée.');
      setSignMode(null);
      const { blob } = await downloadDossierDocument({
        dossierId,
        docKey: 'manager_non_conviction',
      });
      setPreviewBlobUrl((current) => {
        if (current) URL.revokeObjectURL(current);
        return URL.createObjectURL(blob);
      });
      setPreviewKey((k) => k + 1);
    } catch (error) {
      toast.error(mapError(error));
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
      toast.error(mapError(error));
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
