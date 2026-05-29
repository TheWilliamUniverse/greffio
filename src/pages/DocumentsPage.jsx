import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Archive, CheckCircle2, Download, Eye, FilePlus2, FileText, Search, ShieldCheck, Upload } from 'lucide-react';
import { Sidebar } from '@/components/Sidebar.jsx';
import { StatusBadge } from '@/components/StatusBadge.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { INPI_UPLOAD_RULES } from '@/config/legalFlow.js';
import { getCurrentDossierId } from '@/utils/sessionStore.js';
import { downloadDossierDocument, getDossierDocuments, uploadDossierDocument } from '@/api/documents.js';
import { getDossierDocumentEditor, saveDossierDocumentEditor } from '@/api/documents.js';
import { getUser } from '@/utils/localStorage.js';
import { isEiLikeFormality } from '@/config/formalities.js';
import { getDocumentStatusLabel, getDocumentTypeLabel } from '@/utils/documentStatusLabels.js';
import { isInternalUser } from '@/utils/roles.js';
import { getDossierById } from '@/api/dossiers.js';

export const DocumentsPage = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [type, setType] = useState('Tous');
  const [uploading, setUploading] = useState(false);
  const [apiDocuments, setApiDocuments] = useState([]);
  const [selectedDocKey, setSelectedDocKey] = useState('identity_proof');
  const [uploadError, setUploadError] = useState(null);
  const [uploadSuccess, setUploadSuccess] = useState('');
  const [dossierFormalityMeta, setDossierFormalityMeta] = useState({});
  const [editorData, setEditorData] = useState(null);
  const [editorSaving, setEditorSaving] = useState(false);
  const currentDossierId = getCurrentDossierId();
  const user = getUser();
  const internalView = isInternalUser(user);
  const normalizedDocuments = useMemo(() => apiDocuments.map((item) => ({
    id: item.id,
    dossierId: item.dossierId,
    name: item.label || getDocumentTypeLabel(item.docKey),
    label: item.label || getDocumentTypeLabel(item.docKey),
    type: getDocumentTypeLabel(item.docKey, item.label),
    status: String(item.status || '').toUpperCase(),
    statusLabel: getDocumentStatusLabel(item.status),
    date: item.updatedAt || item.uploadedAt || item.createdAt || null,
    hasFile: Boolean(item.filename || item.storageUrl || item.fileUrl),
  })), [apiDocuments]);
  const dossierMeta = useMemo(() => {
    const first = apiDocuments[0]?.metadata?.dossier || {};
    return { ...first, ...dossierFormalityMeta };
  }, [apiDocuments, dossierFormalityMeta]);
  const eiLike = isEiLikeFormality({
    legalForm: dossierMeta.legalForm,
    formeJuridique: dossierMeta.formeJuridique,
    service: dossierMeta.service,
  });
  const uploadableDocKeys = useMemo(() => ([
    ['identity_proof', 'Pièce d’identité'],
    ['address_proof', 'Justificatif de domicile'],
    ['proxy_mandate', 'Procuration signée'],
    ['legal_notice_certificate', 'Attestation annonce légale'],
    ['registered_office_proof', 'Justificatif siège social'],
    ['ubo_declaration', 'Déclaration bénéficiaires effectifs'],
    ['manager_non_conviction', 'Déclaration non-condamnation et filiation (en ligne)'],
    ['minor_emancipation_order', "Ordonnance ou jugement d'émancipation"],
    ['minor_parental_authorization', 'Autorisation parentale / tuteur (associé mineur)'],
    ['signed_statutes', 'Statuts signés'],
    ['capital_certificate', 'Attestation dépôt capital'],
  ].filter(([value]) => !(eiLike && (value === 'signed_statutes' || value === 'capital_certificate')))), [eiLike]);
  useEffect(() => {
    if (uploadableDocKeys.some(([value]) => value === selectedDocKey)) return;
    setSelectedDocKey(uploadableDocKeys[0]?.[0] || 'identity_proof');
  }, [selectedDocKey, uploadableDocKeys]);
  const types = useMemo(() => ['Tous', ...new Set(normalizedDocuments.map((document) => document.type))], [normalizedDocuments]);

  const filteredDocuments = useMemo(() => normalizedDocuments.filter((document) => {
    const searchable = [
      document.name,
      document.label,
      document.type,
      document.statusLabel,
    ].join(' ');
    const matchesQuery = searchable.toLowerCase().includes(query.toLowerCase());
    const matchesType = type === 'Tous' || document.type === type;
    return matchesQuery && matchesType;
  }), [normalizedDocuments, query, type]);

  useEffect(() => {
    const load = async () => {
      if (!currentDossierId) return;
      try {
        const items = await getDossierDocuments(currentDossierId);
        setApiDocuments(items);
        const payload = await getDossierById(currentDossierId);
        const q = payload?.dossier?.dataJson ? JSON.parse(payload.dossier.dataJson) : {};
        setDossierFormalityMeta({
          legalForm: payload?.dossier?.legalForm,
          formeJuridique: q?.formeJuridique,
          service: payload?.dossier?.service,
          typeFormalite: q?.typeFormalite,
        });
      } catch (_error) {
        setApiDocuments([]);
      }
    };
    void load();
  }, [currentDossierId]);

  const onUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file || !currentDossierId) return;
    setUploadError(null);
    setUploadSuccess('');
    if (file.type !== 'application/pdf') {
      setUploadError('Seuls les fichiers PDF sont autorisés.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setUploadError('Le fichier dépasse 10 Mo.');
      return;
    }
    try {
      setUploading(true);
      const payload = await uploadDossierDocument({
        dossierId: currentDossierId,
        docKey: selectedDocKey,
        file,
        ownerFirstName: user?.firstName || '',
        ownerLastName: user?.lastName || '',
      });
      setApiDocuments(payload.documents || []);
      if (payload.warning) {
        setUploadSuccess(payload.warning);
      } else if (payload.analysis?.requiresManualReview) {
        setUploadSuccess('Pièce reçue. Contrôle manuel Greffio requis avant validation finale.');
      } else {
        setUploadSuccess('Pièce déposée et analysée automatiquement.');
      }
    } catch (error) {
      setUploadError(error?.message || "L'upload a échoué.");
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  const openEditor = async () => {
    if (!currentDossierId) return;
    try {
      const payload = await getDossierDocumentEditor({
        dossierId: currentDossierId,
        docKey: 'manager_non_conviction',
      });
      setEditorData(payload);
      setUploadError(null);
    } catch (_error) {
      setUploadError("Impossible d'ouvrir l'éditeur PDF pour ce document.");
    }
  };

  const updateEditorField = (key, value) => {
    setEditorData((current) => {
      const nextFields = {
        ...(current?.fields || {}),
        [key]: value,
      };
      if (key === 'useCaseSelf' || key === 'useCaseParents') {
        const self = key === 'useCaseSelf' ? Boolean(value) : Boolean(nextFields.useCaseSelf);
        const parents = key === 'useCaseParents' ? Boolean(value) : Boolean(nextFields.useCaseParents);
        nextFields.useCaseSelf = self;
        nextFields.useCaseParents = parents;
        if (self && parents) nextFields.useCase = 'both';
        else if (self) nextFields.useCase = 'self';
        else if (parents) nextFields.useCase = 'parents';
        else nextFields.useCase = '';
      }
      return { ...current, fields: nextFields };
    });
  };

  const saveEditor = async () => {
    if (!editorData || !currentDossierId) return;
    setEditorSaving(true);
    try {
      const payload = await saveDossierDocumentEditor({
        dossierId: currentDossierId,
        docKey: 'manager_non_conviction',
        fields: editorData.fields || {},
      });
      setApiDocuments(payload.documents || []);
      setUploadSuccess('Document PDF généré et attaché au dossier.');
      setEditorData(null);
    } catch (error) {
      setUploadError(error?.message || "Le document n'a pas pu être généré.");
    } finally {
      setEditorSaving(false);
    }
  };

  const openDocumentDownload = async (docKey) => {
    if (!currentDossierId || !docKey) return;
    try {
      const { filename, blob } = await downloadDossierDocument({ dossierId: currentDossierId, docKey });
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = filename;
      anchor.rel = 'noopener noreferrer';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);
    } catch (_error) {
      setUploadError('Impossible de télécharger ce document pour le moment.');
    }
  };

  const waitingDocs = normalizedDocuments.filter((document) => ['REQUESTED', 'UNDER_REVIEW', 'INVALID'].includes(document.status));
  const summary = [
    { label: 'Pièces en coffre', value: normalizedDocuments.length, text: 'document(s) du dossier actif', icon: Archive },
    { label: 'À traiter', value: waitingDocs.length, text: 'pièces à compléter ou signer', icon: FileText },
    { label: 'Dossier relié', value: currentDossierId ? 1 : 0, text: currentDossierId ? 'dossier actif sélectionné' : 'aucun dossier actif', icon: CheckCircle2 },
  ];

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden bg-background">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-5 md:p-8">
        <div className="mx-auto max-w-7xl space-y-6">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
            <div>
              <p className="text-sm font-bold uppercase text-primary">Coffre documentaire</p>
              <h1 className="mt-2 text-3xl font-extrabold text-foreground">Documents</h1>
              <p className="mt-2 text-sm text-muted-foreground">Centralisez uniquement les pièces, documents générés, justificatifs tiers et signatures de vos dossiers.</p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="bg-white">
                <FilePlus2 className="h-4 w-4" />
                Générer depuis mon dossier
              </Button>
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white">
                <Upload className="h-4 w-4" />
                {uploading ? 'Upload...' : 'Ajouter une pièce'}
                <input type="file" accept="application/pdf" className="hidden" onChange={onUpload} />
              </label>
            </div>
          </div>

          <section className="rounded-md border border-border bg-white p-4 shadow-elevation-sm">
            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <div className="flex-1">
                <p className="text-sm font-semibold">Type de justificatif</p>
                <select className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-sm" value={selectedDocKey} onChange={(event) => setSelectedDocKey(event.target.value)}>
                  {uploadableDocKeys.map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
              <p className="text-xs text-muted-foreground">PDF uniquement, 10 Mo max, un justificatif par fichier.</p>
            </div>
            {uploadError ? <p className="mt-2 text-xs text-red-600">{uploadError}</p> : null}
            {uploadSuccess ? <p className="mt-2 text-xs text-emerald-700">{uploadSuccess}</p> : null}
            {!currentDossierId ? <p className="mt-2 text-xs text-amber-700">Aucun dossier actif détecté. Ouvrez un dossier puis revenez ici pour déposer vos pièces.</p> : null}
            <div className="mt-3">
              <Button
                variant="outline"
                className="bg-white"
                disabled={!currentDossierId}
                onClick={() => {
                  const url = `/dossier/${currentDossierId}/declaration-non-condamnation`;
                  window.open(url, '_blank', 'noopener,noreferrer');
                  navigate(url);
                }}
              >
                <FilePlus2 className="h-4 w-4" />
                Remplir en ligne : non-condamnation et filiation
              </Button>
            </div>
          </section>

          {editorData ? (
            <section className="rounded-md border border-primary/25 bg-white p-5 shadow-elevation-sm">
              <p className="text-sm font-bold uppercase text-primary">Éditeur PDF en ligne</p>
              <h2 className="mt-1 text-xl font-extrabold">{editorData.title}</h2>
              <p className="mt-1 text-xs text-primary">Les champs correspondent aux zones du PDF remplissable généré (compatible lecteurs PDF).</p>
              <div className="mt-4 rounded-md border border-border bg-muted p-4">
                <p className="text-sm font-bold">Cas d&apos;usage</p>
                <div className="mt-2 flex flex-wrap gap-4">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={Boolean(editorData.fields?.useCaseSelf ?? (editorData.fields?.useCase === 'self' || editorData.fields?.useCase === 'both'))}
                      onChange={(event) => updateEditorField('useCaseSelf', event.target.checked)}
                    />
                    Pour moi (dirigeant / associé)
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={Boolean(editorData.fields?.useCaseParents ?? (editorData.fields?.useCase === 'parents' || editorData.fields?.useCase === 'both'))}
                      onChange={(event) => updateEditorField('useCaseParents', event.target.checked)}
                    />
                    Filiation (parents)
                  </label>
                </div>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <Input placeholder="Nom complet" value={editorData.fields?.declarantFullName || ''} onChange={(event) => updateEditorField('declarantFullName', event.target.value)} />
                <Input placeholder="Date de naissance" type="date" value={editorData.fields?.declarantBirthDate || ''} onChange={(event) => updateEditorField('declarantBirthDate', event.target.value)} />
                <Input placeholder="Ville de naissance" value={editorData.fields?.declarantBirthCity || ''} onChange={(event) => updateEditorField('declarantBirthCity', event.target.value)} />
                <Input placeholder="Adresse" value={editorData.fields?.declarantAddress || ''} onChange={(event) => updateEditorField('declarantAddress', event.target.value)} />
                <Input placeholder="Nom parent 1" value={editorData.fields?.parent1FullName || ''} onChange={(event) => updateEditorField('parent1FullName', event.target.value)} />
                <Input placeholder="Nom parent 2" value={editorData.fields?.parent2FullName || ''} onChange={(event) => updateEditorField('parent2FullName', event.target.value)} />
                <Input placeholder="Ville de signature" value={editorData.fields?.statementCity || ''} onChange={(event) => updateEditorField('statementCity', event.target.value)} />
                <Input placeholder="Date de signature" type="date" value={editorData.fields?.statementDate || ''} onChange={(event) => updateEditorField('statementDate', event.target.value)} />
              </div>
              <div className="mt-3 grid gap-2">
                <label className="text-sm">
                  <input type="checkbox" checked={Boolean(editorData.fields?.declarationNonCondamnation)} onChange={(event) => updateEditorField('declarationNonCondamnation', event.target.checked)} />
                  {' '}Je confirme la déclaration de non-condamnation.
                </label>
                <label className="text-sm">
                  <input type="checkbox" checked={Boolean(editorData.fields?.declarationFiliation)} onChange={(event) => updateEditorField('declarationFiliation', event.target.checked)} />
                  {' '}Je confirme la déclaration de filiation.
                </label>
                <Input placeholder="Nom du signataire" value={editorData.fields?.signatureFullName || ''} onChange={(event) => updateEditorField('signatureFullName', event.target.value)} />
              </div>
              <div className="mt-4 flex gap-3">
                <Button onClick={saveEditor} disabled={editorSaving}>
                  {editorSaving ? 'Génération...' : 'Générer le PDF'}
                </Button>
                <Button variant="outline" className="bg-white" onClick={() => setEditorData(null)}>
                  Annuler
                </Button>
              </div>
            </section>
          ) : null}

          <section className="grid gap-4 md:grid-cols-3">
            {summary.map((item) => (
              <div key={item.label} className="rounded-md border border-border bg-white p-5 shadow-elevation-sm">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-md bg-secondary text-primary">
                  <item.icon className="h-5 w-5" />
                </div>
                <p className="text-sm font-semibold text-muted-foreground">{item.label}</p>
                <p className="mt-1 text-3xl font-extrabold text-foreground">{item.value}</p>
                <p className="mt-1 text-xs text-muted-foreground">{item.text}</p>
              </div>
            ))}
          </section>

          <section className="rounded-md border border-border bg-white p-4 shadow-elevation-sm">
            <div className="flex flex-col gap-3 md:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input className="pl-9" placeholder="Rechercher un document, une source, un dossier ou une pièce..." value={query} onChange={(event) => setQuery(event.target.value)} />
              </div>
              <select className="h-9 rounded-md border border-input bg-background px-3 text-sm" value={type} onChange={(event) => setType(event.target.value)}>
                {types.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </div>
          </section>

          <section className="rounded-md border border-primary/20 bg-secondary p-5 shadow-elevation-sm">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-1 h-5 w-5 text-primary" />
              <div>
                <p className="font-extrabold text-foreground">Dépôt simplifié et sécurisé (Guichet unique)</p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  Chaque pièce est automatiquement renommée au format attendu, dans un fichier PDF unique et lisible ({INPI_UPLOAD_RULES.maxFileSizeMb} Mo max).
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Vous n&apos;avez rien à mémoriser : Greffio applique la nomenclature et contrôle la cohérence avant traitement.
                </p>
              </div>
            </div>
          </section>

          {filteredDocuments.length === 0 ? (
            <section className="rounded-md border border-dashed border-primary/30 bg-white p-8 text-center shadow-elevation-sm">
              <Archive className="mx-auto h-10 w-10 text-primary" />
              <h2 className="mt-4 text-2xl font-extrabold">Coffre documentaire vide</h2>
              <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                {eiLike
                  ? "Aucun document n’est encore enregistré sur le dossier actif. Les pièces EI/micro (identité, domicile, déclaration d'activité, justificatifs) apparaîtront ici après génération ou dépôt."
                  : 'Aucun document n’est encore enregistré sur le dossier actif. Les statuts, attestations, justificatifs, annonces et pièces greffe apparaîtront ici après génération ou dépôt.'}
              </p>
              <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
                <Button>
                  <Upload className="h-4 w-4" />
                  Ajouter une pièce
                </Button>
                <Button variant="outline" className="bg-white">
                  <FilePlus2 className="h-4 w-4" />
                  Générer un document
                </Button>
              </div>
            </section>
          ) : (
            <section className="overflow-hidden rounded-md border border-border bg-white shadow-elevation-sm">
              <div className="grid grid-cols-[1.4fr_140px_120px] gap-4 border-b border-border bg-muted px-5 py-3 text-xs font-bold uppercase text-muted-foreground max-lg:hidden">
                <span>Document</span>
                <span>Statut</span>
                <span>Actions</span>
              </div>
              {filteredDocuments.map((document) => (
                <div key={document.id} className="grid gap-4 border-b border-border px-5 py-4 last:border-b-0 lg:grid-cols-[1.4fr_140px_120px] lg:items-center">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-md bg-secondary text-primary">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-bold text-foreground">{document.name}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {document.date ? `Mis à jour le ${new Date(document.date).toLocaleDateString('fr-FR')}` : 'En attente de dépôt'}
                      </p>
                    </div>
                  </div>
                  <StatusBadge status={document.status} className="w-fit" />
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className="bg-white"
                      aria-label="Aperçu"
                      onClick={() => openDocumentDownload(apiDocuments.find((item) => item.id === document.id)?.docKey)}
                      disabled={!currentDossierId || !document.hasFile}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="bg-white"
                      aria-label="Télécharger"
                      onClick={() => openDocumentDownload(apiDocuments.find((item) => item.id === document.id)?.docKey)}
                      disabled={!currentDossierId || !document.hasFile}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </section>
          )}

          {internalView && apiDocuments.length > 0 ? (
            <section className="overflow-hidden rounded-md border border-dashed border-border bg-muted/30 shadow-elevation-sm">
              <div className="border-b border-border bg-muted px-5 py-3 text-xs font-bold uppercase text-muted-foreground">
                Vue technique (équipe Greffio)
              </div>
              {apiDocuments.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-3 border-b border-border px-5 py-3 last:border-b-0">
                  <div>
                    <p className="text-sm font-bold">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{item.docKey} · {item.status}</p>
                  </div>
                  <StatusBadge status={String(item.status || '').toUpperCase()} className="w-fit" />
                </div>
              ))}
            </section>
          ) : null}
          {currentDossierId ? (
            <div className="text-right">
              <Button asChild variant="outline" className="bg-white">
                <Link to={`/dossier/${currentDossierId}`}>Retour au dossier</Link>
              </Button>
            </div>
          ) : null}
        </div>
      </main>
    </div>
  );
};
