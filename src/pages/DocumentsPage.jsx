import React, { useMemo, useState } from 'react';
import { Archive, CheckCircle2, Download, Eye, FilePlus2, FileText, Search, ShieldCheck, Upload } from 'lucide-react';
import { Sidebar } from '@/components/Sidebar.jsx';
import { StatusBadge } from '@/components/StatusBadge.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { getDocuments, getDossiers } from '@/utils/localStorage.js';
import { FILE_NAMING_EXAMPLES, INPI_UPLOAD_RULES } from '@/config/legalFlow.js';

export const DocumentsPage = () => {
  const [query, setQuery] = useState('');
  const [type, setType] = useState('Tous');
  const dossiers = getDossiers();
  const documents = getDocuments();
  const dossiersById = useMemo(() => new Map(dossiers.map((dossier) => [dossier.id, dossier])), [dossiers]);
  const types = ['Tous', ...new Set(documents.map((document) => document.type))];

  const filteredDocuments = documents.filter((document) => {
    const dossier = dossiersById.get(document.dossierId);
    const searchable = [
      document.name,
      document.type,
      document.status,
      document.source,
      document.providedBy,
      document.requiredFor,
      document.nextAction,
      dossier.name,
    ].join(' ');
    const matchesQuery = searchable.toLowerCase().includes(query.toLowerCase());
    const matchesType = type === 'Tous' || document.type === type;
    return matchesQuery && matchesType;
  });

  const dossierName = (id) => dossiersById.get(id).name || 'Dossier client';
  const waitingDocs = documents.filter((document) => ['ATTENTE_DOCS', 'URGENT', 'EN_ANALYSE', 'A_SIGNER', 'BROUILLON'].includes(document.status));
  const thirdPartyDocs = documents.filter((document) => document.providedBy === 'Tiers');
  const summary = [
    { label: 'Pièces en coffre', value: documents.length, text: 'document(s) du client', icon: Archive },
    { label: 'Documents tiers', value: thirdPartyDocs.length, text: 'banque, annonce légale, greffe', icon: ShieldCheck },
    { label: 'À traiter', value: waitingDocs.length, text: 'pièces à compléter ou signer', icon: FileText },
    { label: 'Dossiers reliés', value: dossiers.length, text: 'dossier(s) ouvert(s)', icon: CheckCircle2 },
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
              <Button>
                <Upload className="h-4 w-4" />
                Ajouter une pièce
              </Button>
            </div>
          </div>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
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
                <p className="font-extrabold text-foreground">Regles de depot (Guichet unique)</p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  Chaque piece doit etre dans un seul fichier PDF, clairement nomme, lisible et inferieur ou egal a {INPI_UPLOAD_RULES.maxFileSizeMb} Mo.
                </p>
                <div className="mt-3 grid gap-2 md:grid-cols-2">
                  {FILE_NAMING_EXAMPLES.slice(0, 6).map((item) => (
                    <code key={item} className="rounded bg-white px-3 py-2 text-xs text-primary">
                      {item}
                    </code>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {filteredDocuments.length === 0 ? (
            <section className="rounded-md border border-dashed border-primary/30 bg-white p-8 text-center shadow-elevation-sm">
              <Archive className="mx-auto h-10 w-10 text-primary" />
              <h2 className="mt-4 text-2xl font-extrabold">Coffre documentaire vide</h2>
              <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                Aucun document client n’est encore enregistré. Les statuts, attestations, justificatifs, annonces et pièces greffe apparaîtront ici après génération, upload ou ajout par un tiers.
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
              <div className="grid grid-cols-[1.4fr_180px_190px_130px_130px] gap-4 border-b border-border bg-muted px-5 py-3 text-xs font-bold uppercase text-muted-foreground max-lg:hidden">
                <span>Document</span>
                <span>Source</span>
                <span>Utilisation</span>
                <span>Statut</span>
                <span>Actions</span>
              </div>
              {filteredDocuments.map((document) => (
                <div key={document.id} className="grid gap-4 border-b border-border px-5 py-4 last:border-b-0 lg:grid-cols-[1.4fr_180px_190px_130px_130px] lg:items-center">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-md bg-secondary text-primary">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-bold text-foreground">{document.name}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{dossierName(document.dossierId)} · {document.size} · ajouté le {new Date(document.date).toLocaleDateString('fr-FR')}</p>
                      <p className="mt-1 text-xs font-semibold text-primary">{document.type} · {document.version}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground">{document.source}</p>
                    <p className="mt-1 text-xs text-muted-foreground">Fourni par : {document.providedBy}</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{document.requiredFor}</p>
                    <p className="mt-1 text-xs text-muted-foreground">Action : {document.nextAction}</p>
                  </div>
                  <StatusBadge status={document.status} className="w-fit" />
                  <div className="flex gap-2">
                    <Button variant="outline" size="icon" className="bg-white" aria-label="Aperçu">
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon" className="bg-white" aria-label="Télécharger">
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </section>
          )}
        </div>
      </main>
    </div>
  );
};
