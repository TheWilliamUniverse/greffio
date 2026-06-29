import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileSignature,
  FileText,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button.jsx';
import { Sidebar } from '@/components/Sidebar.jsx';
import { DossierBreadcrumb } from '@/components/layout/DossierBreadcrumb.jsx';
import { PdfPreviewPanel } from '@/components/documents/PdfPreviewPanel.jsx';
import { QuestionnaireNotice } from '@/components/questionnaire/QuestionnaireNotice.jsx';
import { getCurrentDossierId, saveCurrentDossierId } from '@/utils/sessionStore.js';
import { downloadStatutesPdf, fetchStatutesPreview, generateStatutes, listStatutes } from '@/api/statutes.js';
import { getDossierById } from '@/api/dossiers.js';
import { isEiLikeFormality } from '@/config/formalities.js';
import { downloadStatutesOfficeExport } from '@/utils/statutesOfficeExport.js';
import { useAuth } from '@/hooks/useAuth.js';
import { isCapacitorNative, isMobileBrowserViewport } from '@/utils/platform.js';
import { mapDocumentPreviewError, normalizePdfBlob, openCachedPdfInSystemViewer, savePdfBlobToDevice } from '@/utils/dossierDocumentFile.js';
import { useMobileSafeBottomPadding } from '@/hooks/useMobileSafeBottomPadding.js';
import { cn } from '@/lib/utils.js';
import { QUESTIONNAIRE_NEW_PATH, questionnaireResumePath } from '@/utils/questionnaireNavigation.js';
import { resolveStatutesGenerationToast } from '@/utils/statutesGenerationErrors.js';

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

const resolveStatutesWilliamHint = (legalForm) => {
  const form = String(legalForm || '').toUpperCase();
  if (['SARL', 'EURL', 'SCI'].includes(form)) {
    return `Statuts adaptés William (${form}) — structure conforme, relecture avant dépôt.`;
  }
  if (form === 'SASU') {
    return '27 articles William SASU — document complet prêt à relire avant génération PDF.';
  }
  return '27 articles William SAS — document complet prêt à relire avant génération PDF.';
};

export const StatutesPage = ({ presentation = 'auto' }) => {
  const bottomPad = useMobileSafeBottomPadding();
  const isMobilePresentation = presentation === 'mobile'
    || (presentation === 'auto' && (isCapacitorNative() || isMobileBrowserViewport()));
  const [searchParams] = useSearchParams();
  const { currentUser } = useAuth();
  const [dossierId, setDossierId] = useState(() => searchParams.get('dossierId') || getCurrentDossierId());
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [documents, setDocuments] = useState([]);
  const [eiLike, setEiLike] = useState(false);
  const [preview, setPreview] = useState(null);
  const [pdfBlobUrl, setPdfBlobUrl] = useState('');
  const [pdfBlob, setPdfBlob] = useState(null);
  const [dossierName, setDossierName] = useState('');
  const [loadError, setLoadError] = useState('');
  const [showDocumentsLink, setShowDocumentsLink] = useState(false);
  const [generationError, setGenerationError] = useState('');
  const [generationHint, setGenerationHint] = useState('');

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
      setDossierName(dossierPayload?.dossier?.companyName || dossierPayload?.dossier?.denomination || 'Dossier');
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

  useEffect(() => () => {
    if (pdfBlobUrl) URL.revokeObjectURL(pdfBlobUrl);
  }, [pdfBlobUrl]);

  useEffect(() => {
    if (!dossierId || eiLike || !documents.length) {
      setPdfBlobUrl((current) => {
        if (current) URL.revokeObjectURL(current);
        return '';
      });
      setPdfBlob(null);
      return undefined;
    }
    let cancelled = false;
    void downloadStatutesPdf(dossierId, { cacheBust: true })
      .then(async (blob) => {
        if (cancelled) return;
        const normalized = await normalizePdfBlob(blob);
        setPdfBlob(normalized);
        setPdfBlobUrl((current) => {
          if (current) URL.revokeObjectURL(current);
          return URL.createObjectURL(normalized);
        });
      })
      .catch(() => {
        if (!cancelled) {
          setPdfBlob(null);
          setPdfBlobUrl((current) => {
            if (current) URL.revokeObjectURL(current);
            return '';
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [dossierId, documents.length, eiLike]);

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
      setGenerationError('');
      setGenerationHint('');
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
      setShowDocumentsLink(true);
      toast.success(
        completeness != null
          ? `Statuts générés (${completeness} % des données obligatoires intégrées).`
          : 'Statuts générés.',
      );
    } catch (error) {
      const resolved = resolveStatutesGenerationToast(error, dossierId);
      setGenerationError(resolved.message);
      setGenerationHint(resolved.hint || '');
      toast.error(resolved.message);
    } finally {
      setGenerating(false);
    }
  };

  const onDownload = async () => {
    if (!dossierId) return;
    try {
      const blob = pdfBlob || await downloadStatutesPdf(dossierId, { cacheBust: true });
      const normalized = await normalizePdfBlob(blob);
      if (isCapacitorNative() || isMobileBrowserViewport()) {
        await openCachedPdfInSystemViewer({
          blob: normalized,
          filename: 'Statuts_Greffio.pdf',
        });
        toast.success(isCapacitorNative() ? 'PDF ouvert sur votre appareil.' : 'PDF prêt à être enregistré ou partagé.');
        return;
      }
      await savePdfBlobToDevice(normalized, 'Statuts_Greffio.pdf');
    } catch (error) {
      toast.error(mapDocumentPreviewError(error) || 'Aucun PDF de statuts disponible.');
    }
  };

  const onOpenPdfPreview = async () => {
    if (!pdfBlob) {
      toast.error('Générez les statuts pour afficher le PDF.');
      return;
    }
    try {
      if (isCapacitorNative() || isMobileBrowserViewport()) {
        await openCachedPdfInSystemViewer({
          blob: pdfBlob,
          filename: 'Statuts_Greffio.pdf',
        });
        return;
      }
      if (pdfBlobUrl) {
        window.open(pdfBlobUrl, '_blank', 'noopener,noreferrer');
      }
    } catch (error) {
      toast.error(mapDocumentPreviewError(error) || 'Impossible d’ouvrir le PDF.');
    }
  };

  const exportDocument = async (format) => {
    if (!preview) {
      toast.error('Aperçu indisponible.');
      return;
    }
    try {
      await downloadStatutesOfficeExport(preview, format);
      toast.success(`Export ${format.toUpperCase()} lancé.`);
    } catch (_error) {
      toast.error(`Export ${format.toUpperCase()} impossible.`);
    }
  };

  const isOpsViewer = ['ADMIN', 'OPS', 'FORMALISTE', 'TEAM'].includes(currentUser?.role);
  const incorporated = preview?.incorporatedData;
  const completeness = preview?.metadata?.completeness ?? 0;
  const statutesWilliamHint = resolveStatutesWilliamHint(incorporated?.legalForm);

  return (
    <div className={cn(
      'flex overflow-x-hidden bg-[var(--we-bg)]',
      isMobilePresentation ? 'min-h-0 flex-col' : 'min-h-[calc(100vh-4rem)]',
    )}>
      {!isMobilePresentation ? <Sidebar /> : null}
      <main className={cn('flex-1 overflow-y-auto', isMobilePresentation ? `p-4 ${bottomPad}` : 'p-5 md:p-8')}>
        <div className="mx-auto max-w-5xl space-y-6">
          {dossierId ? (
            <DossierBreadcrumb dossierId={dossierId} dossierName={dossierName} section="Statuts" />
          ) : null}
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
            <div className={cn('flex flex-wrap gap-2', isMobilePresentation && 'w-full grid grid-cols-1 sm:grid-cols-2')}>
              <Button type="button" variant="outline" className={cn('bg-white', isMobilePresentation && 'h-11 w-full')} onClick={() => void load()} disabled={loading}>
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Actualiser
              </Button>
              <Button type="button" className={cn(isMobilePresentation && 'h-11 w-full')} onClick={() => void onGenerate()} disabled={generating || eiLike}>
                <FileSignature className="h-4 w-4" />
                {generating ? 'Génération…' : 'Générer les statuts'}
              </Button>
              <Button type="button" variant="outline" className={cn('bg-white', isMobilePresentation && 'h-11 w-full sm:col-span-2')} onClick={() => void onDownload()} disabled={!documents.length || eiLike}>
                <Download className="h-4 w-4" />
                Télécharger PDF
              </Button>
              {!eiLike && preview && !isMobilePresentation ? (
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

          {generationError ? (
            <QuestionnaireNotice variant="error" title="Génération des statuts">
              <p>{generationError}</p>
              {generationHint ? (
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{generationHint}</p>
              ) : null}
              <p className="mt-2">
                <Link
                  to={dossierId ? questionnaireResumePath(dossierId) : QUESTIONNAIRE_NEW_PATH}
                  className="font-semibold underline underline-offset-2"
                >
                  Compléter le questionnaire
                </Link>
              </p>
            </QuestionnaireNotice>
          ) : null}

          {showDocumentsLink && !eiLike ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 px-4 py-3 text-sm text-emerald-900">
              Les statuts ont été enregistrés dans votre coffre documentaire.{' '}
              <Link to="/documents" className="font-semibold underline underline-offset-2">
                Voir dans Documents
              </Link>
            </div>
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
                        <> – champs manquants : {preview.metadata.missingFields.join(', ')}</>
                      ) : null}
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground">{statutesWilliamHint}</p>
                  </div>
                  <Button asChild variant="outline" className="bg-white">
                    <Link to={dossierId ? questionnaireResumePath(dossierId) : QUESTIONNAIRE_NEW_PATH}>Compléter le questionnaire</Link>
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
                      ['Couverture', `${preview.cover?.title} – ${preview.cover?.denomination || preview.cover?.subtitle}`],
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
                        <dd className="font-medium text-foreground">{value || '–'}</dd>
                      </div>
                    ))}
                  </dl>
                </div>

                <div className="we-panel p-6 lg:col-span-2">
                  <h2 className="text-lg font-extrabold">Statuts complets</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {statutesWilliamHint}
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
                            <h3 className="text-sm font-extrabold text-primary">{`Article ${block.number} – ${block.title}`}</h3>
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

          {!eiLike && pdfBlobUrl ? (
            <section className="overflow-hidden rounded-md border border-[var(--we-border)] bg-white shadow-elevation-sm">
              <div className="border-b border-[var(--we-border)] bg-[#fafcff] px-5 py-3 text-xs font-bold uppercase text-muted-foreground">
                Aperçu PDF généré
              </div>
              <PdfPreviewPanel
                title="Statuts Greffio"
                blobUrl={pdfBlobUrl}
                filename="Statuts_Greffio.pdf"
                emptyMessage="Générez les statuts pour afficher le PDF ici."
                onOpen={isMobilePresentation ? () => void onOpenPdfPreview() : undefined}
              />
            </section>
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
