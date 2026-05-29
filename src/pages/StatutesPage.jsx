import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileText,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button.jsx';
import { Sidebar } from '@/components/Sidebar.jsx';
import { QuestionnaireNotice } from '@/components/questionnaire/QuestionnaireNotice.jsx';
import { getCurrentDossierId, saveCurrentDossierId } from '@/utils/sessionStore.js';
import { downloadStatutesPdf, fetchStatutesPreview, generateStatutes, listStatutes } from '@/api/statutes.js';
import { getDossierById } from '@/api/dossiers.js';
import { isEiLikeFormality } from '@/config/formalities.js';
import { downloadPreview } from '@/utils/formalityEngine.js';
import { fullPreviewToDocumentPreview } from '@/utils/statutesPreview.js';
import { useAuth } from '@/context/AuthContext.jsx';

const parseQuestionnaire = (dataJson) => {
  if (!dataJson) return {};
  if (typeof dataJson === 'object') return dataJson;
  try {
    return JSON.parse(dataJson);
  } catch (_error) {
    return {};
  }
};

const StatutesArticleBody = ({ body }) => (
  <div className="mt-2 space-y-3">
    {String(body || '')
      .split(/\n\n+/)
      .map((paragraph) => paragraph.trim())
      .filter(Boolean)
      .map((paragraph, index) => (
        <p key={`${index}-${paragraph.slice(0, 24)}`} className="text-sm leading-relaxed text-foreground">
          {paragraph}
        </p>
      ))}
  </div>
);

const ChecklistItem = ({ label, ok }) => (
  <div className={`flex items-start gap-3 rounded-xl border p-4 ${ok ? 'border-emerald-200 bg-emerald-50/60' : 'border-amber-200 bg-amber-50/60'}`}>
    {ok ? (
      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
    ) : (
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden="true" />
    )}
    <div>
      <p className="text-sm font-semibold text-foreground">{label}</p>
      <p className="text-xs text-muted-foreground">{ok ? 'Intégré dans le document' : 'À compléter dans le questionnaire'}</p>
    </div>
  </div>
);

export const StatutesPage = () => {
  const [searchParams] = useSearchParams();
  const { currentUser } = useAuth();
  const [dossierId, setDossierId] = useState(() => searchParams.get('dossierId') || getCurrentDossierId());
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [documents, setDocuments] = useState([]);
  const [eiLike, setEiLike] = useState(false);
  const [preview, setPreview] = useState(null);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    const fromUrl = searchParams.get('dossierId');
    if (fromUrl) {
      saveCurrentDossierId(fromUrl);
      setDossierId(fromUrl);
    }
  }, [searchParams]);

  useEffect(() => {
    const syncDossierId = () => {
      const fromUrl = searchParams.get('dossierId');
      if (fromUrl) return;
      setDossierId(getCurrentDossierId());
    };
    syncDossierId();
    window.addEventListener('focus', syncDossierId);
    return () => window.removeEventListener('focus', syncDossierId);
  }, [searchParams]);

  const load = async (forcedDossierId = null) => {
    const activeId = forcedDossierId || dossierId || getCurrentDossierId();
    if (!activeId) {
      setLoading(false);
      setDocuments([]);
      setPreview(null);
      setLoadError('');
      return;
    }
    setLoading(true);
    setLoadError('');
    let listOk = false;

    try {
      const payload = await listStatutes(activeId);
      listOk = true;
      setDocuments(payload.documents || []);
      if (payload.dossierId) {
        saveCurrentDossierId(payload.dossierId);
        setDossierId(payload.dossierId);
      }
    } catch (error) {
      setDocuments([]);
      const code = error?.payload?.error || error?.message;
      if (code === 'DOSSIER_FORBIDDEN') {
        setLoadError('Ce dossier n’est pas rattaché à votre compte. Rechargez depuis le questionnaire.');
      } else if (code === 'DOSSIER_NOT_FOUND') {
        setLoadError('Dossier introuvable. Recommencez le questionnaire pour créer un nouveau dossier.');
      } else {
        setLoadError('Impossible de charger les versions de statuts pour ce dossier.');
      }
    }

    try {
      const dossierPayload = await getDossierById(activeId);
      const q = parseQuestionnaire(dossierPayload?.dossier?.dataJson);
      const ei = isEiLikeFormality({
        legalForm: dossierPayload?.dossier?.legalForm,
        formeJuridique: q?.formeJuridique,
        typeFormalite: q?.typeFormalite,
        service: dossierPayload?.dossier?.service,
      });
      setEiLike(ei);
      if (!ei) {
        try {
          const previewPayload = await fetchStatutesPreview(activeId);
          setPreview(previewPayload?.preview || null);
        } catch (_error) {
          setPreview(null);
        }
      } else {
        setPreview(null);
      }
    } catch (error) {
      setPreview(null);
      if (!listOk) {
        const code = error?.payload?.error || error?.message;
        if (code === 'DOSSIER_FORBIDDEN') {
          setLoadError('Ce dossier n’est pas rattaché à votre compte. Rechargez depuis le questionnaire.');
        } else if (code === 'DOSSIER_NOT_FOUND') {
          setLoadError('Dossier introuvable. Recommencez le questionnaire pour créer un nouveau dossier.');
        } else {
          setLoadError('Impossible de charger les statuts pour ce dossier.');
        }
      }
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
      const payload = await generateStatutes(dossierId);
      if (payload?.dossierId) {
        saveCurrentDossierId(payload.dossierId);
        setDossierId(payload.dossierId);
      }
      if (Array.isArray(payload?.documents) && payload.documents.length) {
        setDocuments(payload.documents);
      }
      await load(payload?.dossierId || dossierId);
      const completeness = payload?.document?.completeness;
      toast.success(
        completeness != null
          ? `Statuts générés (${completeness} % des données obligatoires intégrées).`
          : 'Statuts générés.',
      );
    } catch (error) {
      const code = error?.payload?.error;
      if (code === 'STATUTES_NOT_REQUIRED_FOR_EI') {
        toast.error('Statuts non applicables à ce dossier.');
      } else if (code === 'DOSSIER_FORBIDDEN' || code === 'DOSSIER_NOT_FOUND') {
        toast.error('Dossier inaccessible. Ouvrez le questionnaire puis revenez ici.');
      } else if (code === 'STATUTES_VALIDATION_FAILED') {
        toast.error('Données incomplètes : complétez le questionnaire puis réessayez.');
      } else if (code === 'STATUTES_INCOMPLETE') {
        toast.error('Le modèle de statuts est incomplet. Contactez le support Greffio.');
      } else if (code === 'LEGAL_FORM_UNSUPPORTED') {
        toast.error('Forme juridique non prise en charge pour la génération automatique.');
      } else {
        toast.error('Génération impossible.');
      }
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

  const exportDocument = async (format) => {
    if (!preview) {
      toast.error('Aperçu indisponible.');
      return;
    }
    try {
      await downloadPreview(fullPreviewToDocumentPreview(preview), format);
      toast.success(`Export ${format.toUpperCase()} lancé.`);
    } catch (_error) {
      toast.error(`Export ${format.toUpperCase()} impossible.`);
    }
  };

  const isOpsViewer = ['ADMIN', 'OPS', 'FORMALISTE', 'TEAM'].includes(currentUser?.role);
  const incorporated = preview?.incorporatedData;
  const completeness = preview?.metadata?.completeness ?? 0;

  return (
    <div className="flex min-h-[calc(100vh-4rem)] overflow-x-hidden bg-[var(--we-bg)]">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-5 md:p-8">
        <div className="mx-auto max-w-5xl space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-bold uppercase text-primary">Documents juridiques</p>
              <h1 className="mt-1 text-3xl font-extrabold text-foreground">
                {eiLike ? 'Parcours EI / micro' : `Statuts ${incorporated?.legalForm || 'SAS / SASU / SARL / EURL / SCI'}`}
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                {eiLike
                  ? 'Les statuts ne sont pas applicables. Ce dossier suit un flux déclaratif sans génération de statuts.'
                  : isOpsViewer
                    ? 'Vue équipe Greffio : consultation et génération pour tout dossier client (sans assignation personnelle requise).'
                    : 'Vos réponses alimentent automatiquement le préambule, les articles, les annexes et les blocs de signature du PDF.'}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" className="bg-white" onClick={() => void load()} disabled={loading}>
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Actualiser
              </Button>
              <Button type="button" onClick={() => void onGenerate()} disabled={generating || eiLike}>
                <FileText className="h-4 w-4" />
                {generating ? 'Génération…' : 'Générer les statuts'}
              </Button>
              <Button type="button" variant="outline" className="bg-white" onClick={() => void onDownload()} disabled={!documents.length || eiLike}>
                <Download className="h-4 w-4" />
                Télécharger PDF
              </Button>
              {!eiLike && preview ? (
                <>
                  <Button type="button" variant="outline" className="bg-white" onClick={() => void exportDocument('docx')}>
                    Export DOCX
                  </Button>
                  <Button type="button" variant="outline" className="bg-white" onClick={() => void exportDocument('odt')}>
                    Export ODT
                  </Button>
                </>
              ) : null}
            </div>
          </div>

          {loadError ? (
            <QuestionnaireNotice variant="error" title="Chargement du dossier">
              {loadError}
            </QuestionnaireNotice>
          ) : null}

          {!eiLike && preview ? (
            <>
              <section className="we-panel p-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-5 w-5 text-primary" />
                      <h2 className="text-lg font-extrabold">Données incorporées</h2>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Complétude : <span className="font-bold text-foreground">{completeness} %</span>
                      {preview.metadata?.missingFields?.length ? (
                        <> — champs manquants : {preview.metadata.missingFields.join(', ')}</>
                      ) : null}
                    </p>
                  </div>
                  <Button asChild variant="outline" className="bg-white">
                    <Link to="/questionnaire">Compléter le questionnaire</Link>
                  </Button>
                </div>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  {(preview.metadata?.checks || []).map((item) => (
                    <ChecklistItem key={item.key} label={item.label} ok={item.ok} />
                  ))}
                </div>
              </section>

              <section className="grid gap-6">
                <div className="we-panel p-6">
                  <h2 className="text-lg font-extrabold">Présentation du document</h2>
                  <p className="mt-1 text-sm text-muted-foreground">Structure imposée pour conformité greffe et relecture client.</p>
                  <dl className="mt-5 space-y-3 text-sm">
                    {[
                      ['Couverture', `${preview.cover?.title} — ${preview.cover?.denomination || preview.cover?.subtitle}`],
                      ['Forme juridique', incorporated?.legalForm],
                      ['Modèle', preview.structure?.template || preview.metadata?.template],
                      ['Capital', `${incorporated?.capital} €`],
                      ['Siège', incorporated?.siege],
                      [`${incorporated?.directorRole || 'Dirigeant'}`, incorporated?.director],
                      ['Titres juridiques', `${preview.structure?.sections?.length || 8} titres répartis dans le corps du document`],
                      ['Annexes', `${preview.structure?.annexCount ?? preview.annexes?.length ?? 0} annexes`],
                    ].map(([term, value]) => (
                      <div key={term} className="grid grid-cols-[140px_1fr] gap-3 border-b border-[var(--we-border)] pb-3 last:border-b-0">
                        <dt className="font-semibold text-muted-foreground">{term}</dt>
                        <dd className="font-medium text-foreground">{value || '—'}</dd>
                      </div>
                    ))}
                  </dl>
                </div>

                <div className="we-panel p-6 lg:col-span-2">
                  <h2 className="text-lg font-extrabold">Statuts complets</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {preview.clauseCount || preview.allClauses?.length || 0} articles rédigés — document William prêt à relire avant génération PDF.
                  </p>
                  {preview.preamble?.paragraphs?.length ? (
                    <div className="mt-5 rounded-xl border border-dashed border-[var(--we-border)] bg-[#fafcff] p-4">
                      <p className="text-xs font-bold uppercase text-primary">Préambule</p>
                      <div className="mt-2 space-y-2 text-sm leading-relaxed text-foreground">
                        {preview.preamble.paragraphs.map((paragraph) => (
                          <p key={paragraph.slice(0, 48)}>{paragraph}</p>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  <div className="mt-5 max-h-[36rem] space-y-4 overflow-y-auto pr-1">
                    {(preview.blocks || []).map((block, index) => {
                      if (block.kind === 'legal-title') {
                        return (
                          <div key={`title-${block.text}-${index}`} className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-center">
                            <p className="text-sm font-extrabold uppercase tracking-wide text-primary">{block.text}</p>
                          </div>
                        );
                      }
                      if (block.kind === 'article') {
                        return (
                          <article key={`article-${block.number}`} className="rounded-xl border border-[var(--we-border)] bg-white p-4">
                            <h3 className="text-sm font-extrabold text-primary">{`Article ${block.number} — ${block.title}`}</h3>
                            <StatutesArticleBody body={block.body} />
                          </article>
                        );
                      }
                      if (block.kind === 'section-title' && block.text) {
                        return (
                          <p key={`section-${index}`} className="text-xs font-bold uppercase text-primary">{block.text}</p>
                        );
                      }
                      if (block.kind === 'paragraph' && block.text) {
                        return (
                          <p key={`para-${index}`} className="text-sm leading-relaxed text-foreground">{block.text}</p>
                        );
                      }
                      return null;
                    })}
                  </div>
                  {(preview.annexes || []).length ? (
                    <div className="mt-5 space-y-3">
                      <p className="text-xs font-bold uppercase text-primary">Annexes</p>
                      {preview.annexes.map((annex) => (
                        <article key={annex.title} className="rounded-xl border border-[var(--we-border)] bg-[#fafcff] p-4">
                          <h3 className="text-sm font-extrabold">{annex.title}</h3>
                          <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                            {(annex.paragraphs || []).map((line) => (
                              <p key={line.slice(0, 40)}>{line}</p>
                            ))}
                          </div>
                        </article>
                      ))}
                    </div>
                  ) : null}
                </div>
              </section>
            </>
          ) : null}

          <section className="we-panel overflow-hidden">
            <div className="border-b border-[var(--we-border)] bg-[#fafcff] px-5 py-3 text-xs font-bold uppercase text-muted-foreground">
              Versions générées
            </div>
            {documents.length ? (
              documents.map((item) => (
                <div key={item.id} className="flex items-center justify-between border-b border-[var(--we-border)] px-5 py-4 last:border-b-0">
                  <div>
                    <p className="text-sm font-bold">{item.type}</p>
                    <p className="text-xs text-muted-foreground">v{item.version} · {new Date(item.createdAt).toLocaleString('fr-FR')}</p>
                  </div>
                  <p className="text-xs text-muted-foreground">{Math.round((Number(item.fileSizeBytes || 0) / 1024))} Ko</p>
                </div>
              ))
            ) : (
              <div className="px-5 py-6 text-sm text-muted-foreground">
                {eiLike ? 'Aucun statut requis pour ce dossier.' : 'Aucun statut généré pour ce dossier.'}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
};
