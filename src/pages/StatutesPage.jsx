import React, { useEffect, useState } from 'react';
import { Download, FileText, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button.jsx';
import { Sidebar } from '@/components/Sidebar.jsx';
import { getCurrentDossierId } from '@/utils/sessionStore.js';
import { downloadStatutesPdf, generateStatutes, listStatutes } from '@/api/statutes.js';
import { getDossierById } from '@/api/dossiers.js';
import { isEiLikeFormality } from '@/config/formalities.js';

export const StatutesPage = () => {
  const dossierId = getCurrentDossierId();
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [documents, setDocuments] = useState([]);
  const [eiLike, setEiLike] = useState(false);

  const load = async () => {
    if (!dossierId) {
      setLoading(false);
      setDocuments([]);
      return;
    }
    try {
      setLoading(true);
      const dossierPayload = await getDossierById(dossierId);
      const q = dossierPayload?.dossier?.dataJson ? JSON.parse(dossierPayload.dossier.dataJson) : {};
      setEiLike(isEiLikeFormality({
        legalForm: dossierPayload?.dossier?.legalForm,
        formeJuridique: q?.formeJuridique,
        typeFormalite: q?.typeFormalite,
        service: dossierPayload?.dossier?.service,
      }));
      const payload = await listStatutes(dossierId);
      setDocuments(payload.documents || []);
    } catch (_error) {
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [dossierId]);

  const onGenerate = async () => {
    if (!dossierId) {
      toast.error('Aucun dossier actif.');
      return;
    }
    if (eiLike) {
      toast.error('Les statuts ne sont pas requis pour une EI/micro-entreprise.');
      return;
    }
    try {
      setGenerating(true);
      await generateStatutes(dossierId);
      await load();
      toast.success('Statuts générés.');
    } catch (_error) {
      toast.error('Génération impossible.');
    } finally {
      setGenerating(false);
    }
  };

  const onDownload = async () => {
    if (!dossierId) return;
    try {
      const blob = await downloadStatutesPdf(dossierId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'Statuts_Greffio.pdf';
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (_error) {
      toast.error('Aucun PDF de statuts disponible.');
    }
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden bg-background">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-5 md:p-8">
        <div className="mx-auto max-w-4xl space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-bold uppercase text-primary">Documents juridiques</p>
              <h1 className="mt-1 text-3xl font-extrabold">{eiLike ? 'Parcours EI / micro' : 'Statuts SAS / SASU'}</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {eiLike
                  ? 'Les statuts ne sont pas applicables. Ce dossier suit un flux déclaratif sans génération de statuts.'
                  : 'Génération backend en PDF long (~10 pages), puis téléchargement.'}
              </p>
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" className="bg-white" onClick={load} disabled={loading}>
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Actualiser
              </Button>
              <Button type="button" onClick={onGenerate} disabled={generating || eiLike}>
                <FileText className="h-4 w-4" />
                {generating ? 'Génération...' : 'Générer les statuts'}
              </Button>
              <Button type="button" variant="outline" className="bg-white" onClick={onDownload} disabled={!documents.length || eiLike}>
                <Download className="h-4 w-4" />
                Télécharger PDF
              </Button>
            </div>
          </div>

          <section className="rounded-md border border-border bg-white shadow-elevation-sm">
            <div className="border-b border-border bg-muted px-5 py-3 text-xs font-bold uppercase text-muted-foreground">
              Versions générées
            </div>
            {documents.length ? (
              documents.map((item) => (
                <div key={item.id} className="flex items-center justify-between border-b border-border px-5 py-4 last:border-b-0">
                  <div>
                    <p className="text-sm font-bold">{item.type}</p>
                    <p className="text-xs text-muted-foreground">v{item.version} · {new Date(item.createdAt).toLocaleString('fr-FR')}</p>
                  </div>
                  <p className="text-xs text-muted-foreground">{Math.round((Number(item.fileSizeBytes || 0) / 1024))} Ko</p>
                </div>
              ))
            ) : (
              <div className="px-5 py-6 text-sm text-muted-foreground">Aucun statut généré pour ce dossier.</div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
};
