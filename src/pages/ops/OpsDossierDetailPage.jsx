import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useOutletContext, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  Circle,
  Eye,
  FileText,
  Loader2,
  XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { StatusBadge } from '@/components/StatusBadge.jsx';
import {
  createOpsNote,
  downloadOpsDocument,
  getOpsDossierDetail,
  updateOpsAssignment,
  updateOpsDocumentStatus,
} from '@/api/ops.js';
import {
  fetchOpsDossierMessages,
  postOpsDossierMessage,
  sendOpsDossierMessageEmail,
} from '@/api/dossierMessages.js';
import { DossierMessageThread } from '@/components/messaging/DossierMessageThread.jsx';
import { useDossierMessagesRealtime, sendDossierMessageOptimistic } from '@/hooks/useDossierMessagesRealtime.js';
import { OpsCompletionBadge, OpsPriorityBadge, OpsQueueBadge, OpsRiskBadge, OpsSlaBadge } from '@/components/ops/OpsBadges.jsx';
import { formatDateTime } from '@/components/ops/opsLabels.js';
import { GREFFIO_OPS_TEAM, OPS_PRIORITY_LABELS, OPS_QUEUE_LABELS } from '@/config/opsTeam.js';
import { getDocumentTypeLabel } from '@/utils/documentStatusLabels.js';

const opsDocumentHasFile = (doc) => Boolean(doc?.storageUrl || (doc?.filename && doc.filename !== 'non uploadé'));

const checklistIcon = (status) => {
  if (status === 'done') return <CheckCircle2 className="h-4 w-4 text-emerald-600" />;
  if (status === 'blocked') return <XCircle className="h-4 w-4 text-rose-600" />;
  if (status === 'in_progress') return <Loader2 className="h-4 w-4 animate-spin text-amber-600" />;
  return <Circle className="h-4 w-4 text-slate-300" />;
};

export const OpsDossierDetailPage = () => {
  const { dossierId } = useParams();
  const navigate = useNavigate();
  const { refreshCockpit } = useOutletContext();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [payload, setPayload] = useState(null);
  const [newNote, setNewNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [docUpdating, setDocUpdating] = useState('');
  const [docPreviewing, setDocPreviewing] = useState('');
  const {
    messages,
    setMessages,
    loading: messagesLoading,
  } = useDossierMessagesRealtime(dossierId, fetchOpsDossierMessages, {
    enabled: Boolean(dossierId),
  });

  const loadDetail = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getOpsDossierDetail(dossierId);
      setPayload(data);
    } catch (_err) {
      setError('Impossible de charger la fiche dossier.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadDetail();
  }, [dossierId]);

  const dossier = payload?.dossier;
  const documents = payload?.documents || [];
  const notes = payload?.notes || [];
  const events = payload?.events || [];
  const checklist = payload?.checklist || [];
  const ownerEmail = payload?.ownerEmail || '';

  const saveAssignment = async () => {
    if (!dossier) return;
    setSaving(true);
    try {
      const updated = await updateOpsAssignment({
        dossierId: dossier.id,
        assignedToUserId: dossier.assignedToUserId || null,
        opsQueue: dossier.opsQueue || 'waiting_client',
        opsPriority: dossier.opsPriority || 'normal',
      });
      setPayload((current) => ({ ...current, dossier: updated.dossier }));
      refreshCockpit?.();
    } catch (_err) {
      setError('Impossible de sauvegarder l’assignation.');
    } finally {
      setSaving(false);
    }
  };

  const addNote = async () => {
    if (!dossier || !newNote.trim()) return;
    try {
      const result = await createOpsNote({ dossierId: dossier.id, note: newNote.trim() });
      setPayload((current) => ({ ...current, notes: result.notes || [] }));
      setNewNote('');
    } catch (_err) {
      setError('Impossible d’ajouter la note.');
    }
  };

  const openOpsDocumentPreview = async (docKey) => {
    setDocPreviewing(docKey);
    setError('');
    try {
      const { blob } = await downloadOpsDocument({ dossierId, docKey, inline: true, cacheBust: true });
      const url = window.URL.createObjectURL(blob);
      const previewWindow = window.open(url, '_blank', 'noopener,noreferrer');
      if (!previewWindow) {
        window.URL.revokeObjectURL(url);
        setError('Autorisez les pop-ups pour ouvrir l’aperçu du document.');
        return;
      }
      setTimeout(() => window.URL.revokeObjectURL(url), 120_000);
    } catch (_err) {
      setError('Impossible d’ouvrir ce document pour le moment.');
    } finally {
      setDocPreviewing('');
    }
  };

  const setDocumentStatus = async (docKey, status) => {
    setDocUpdating(docKey);
    try {
      const result = await updateOpsDocumentStatus({ dossierId, docKey, status });
      setPayload((current) => ({ ...current, documents: result.documents || [] }));
      await loadDetail();
      refreshCockpit?.();
    } catch (_err) {
      setError('Impossible de mettre à jour le document.');
    } finally {
      setDocUpdating('');
    }
  };

  if (loading) {
    return <p className="text-sm text-slate-500">Chargement de la fiche dossier…</p>;
  }

  if (!dossier) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-rose-700">{error || 'Dossier introuvable.'}</p>
        <Button type="button" variant="outline" className="bg-white" onClick={() => navigate('/ops/dossiers')}>
          <ArrowLeft className="h-4 w-4" />
          Retour aux dossiers
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Button type="button" variant="ghost" className="mb-2 px-0" onClick={() => navigate('/ops/dossiers')}>
            <ArrowLeft className="h-4 w-4" />
            Dossiers
          </Button>
          <h2 className="text-2xl font-extrabold text-slate-900">{dossier.companyName || 'Sans dénomination'}</h2>
          <p className="mt-1 text-sm text-slate-500">
            {dossier.reference || dossier.id} · {dossier.legalForm || '—'} · {dossier.status}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <OpsRiskBadge score={payload.risk?.riskScore || 0} />
            <OpsSlaBadge status={payload.sla?.status} label={payload.sla?.label} />
            <OpsCompletionBadge score={payload.completionScore || 0} />
            <OpsQueueBadge queue={dossier.opsQueue} />
            <OpsPriorityBadge priority={dossier.opsPriority} />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" className="bg-white" asChild>
            <Link to={`/statuts?dossierId=${dossier.id}`}>
              <FileText className="h-4 w-4" />
              Statuts & exports
            </Link>
          </Button>
          <Button type="button" variant="outline" className="bg-white" asChild>
            <Link to={`/dossier/${dossier.id}`}>Vue client</Link>
          </Button>
        </div>
      </div>

      {error ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{error}</div>
      ) : null}

      <section className="rounded-xl border border-slate-900 bg-slate-900 p-5 text-white">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Prochaine action recommandée</p>
        <p className="mt-2 text-lg font-semibold">{payload.nextBestAction?.label || 'Revue de routine'}</p>
        {payload.risk?.recommendation ? (
          <p className="mt-2 text-sm text-slate-300">{payload.risk.recommendation}</p>
        ) : null}
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-lg font-extrabold text-slate-900">Checklist formaliste</h3>
            <ul className="mt-4 space-y-3">
              {checklist.map((item) => (
                <li key={item.id} className="flex items-center gap-3 rounded-lg border border-slate-100 px-3 py-2">
                  {checklistIcon(item.status)}
                  <span className="text-sm text-slate-800">{item.label}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-5 py-4">
              <h3 className="text-lg font-extrabold text-slate-900">Documents</h3>
            </div>
            <div className="divide-y divide-slate-100">
              {documents.length ? documents.map((doc) => (
                <div key={doc.id || doc.docKey} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                  <div>
                    <p className="font-semibold text-slate-900">{getDocumentTypeLabel(doc.docKey, doc.label)}</p>
                    <p className="text-xs text-slate-500">{doc.docKey} · {doc.filename || 'non uploadé'}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={String(doc.status || '').toUpperCase()} />
                    {opsDocumentHasFile(doc) ? (
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        className="h-8 w-8 bg-white"
                        aria-label="Voir le document"
                        title="Voir le document"
                        disabled={docPreviewing === doc.docKey}
                        onClick={() => void openOpsDocumentPreview(doc.docKey)}
                      >
                        {docPreviewing === doc.docKey
                          ? <Loader2 className="h-4 w-4 animate-spin" />
                          : <Eye className="h-4 w-4" />}
                      </Button>
                    ) : null}
                    {(String(doc.status || '').toLowerCase() === 'uploaded'
                      || String(doc.status || '').toLowerCase() === 'under_review') && (
                      <>
                        <Button
                          type="button"
                          size="sm"
                          disabled={docUpdating === doc.docKey}
                          onClick={() => void setDocumentStatus(doc.docKey, 'valid')}
                        >
                          Valider
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="bg-white"
                          disabled={docUpdating === doc.docKey}
                          onClick={() => void setDocumentStatus(doc.docKey, 'invalid')}
                        >
                          Rejeter
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              )) : (
                <p className="px-5 py-6 text-sm text-slate-500">Aucun document.</p>
              )}
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-5 py-4">
              <h3 className="text-lg font-extrabold text-slate-900">Timeline</h3>
            </div>
            <div className="space-y-3 p-5">
              {events.length ? events.map((event) => (
                <div key={event.id} className="flex gap-3 rounded-lg bg-slate-50 p-3">
                  <CalendarClock className="mt-0.5 h-4 w-4 text-slate-500" />
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{event.toStatus || event.reason || 'Événement'}</p>
                    <p className="text-xs text-slate-500">{event.actorType} · {formatDateTime(event.createdAt)}</p>
                  </div>
                </div>
              )) : <p className="text-sm text-slate-500">Aucun événement.</p>}
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-lg font-extrabold text-slate-900">Pilotage ops</h3>
            <div className="mt-4 space-y-4">
              <div>
                <p className="mb-1 text-xs font-bold uppercase text-slate-500">Assignation formaliste</p>
                <select
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"
                  value={dossier.assignedToUserId || ''}
                  onChange={(event) => setPayload((current) => ({
                    ...current,
                    dossier: { ...current.dossier, assignedToUserId: event.target.value || null },
                  }))}
                >
                  <option value="">Non assigné — équipe globale</option>
                  {GREFFIO_OPS_TEAM.map((member) => (
                    <option key={member.id} value={member.email}>{member.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="mb-1 text-xs font-bold uppercase text-slate-500">File ops</p>
                  <select
                    className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"
                    value={dossier.opsQueue || 'waiting_client'}
                    onChange={(event) => setPayload((current) => ({
                      ...current,
                      dossier: { ...current.dossier, opsQueue: event.target.value },
                    }))}
                  >
                    {Object.entries(OPS_QUEUE_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <p className="mb-1 text-xs font-bold uppercase text-slate-500">Priorité</p>
                  <select
                    className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"
                    value={dossier.opsPriority || 'normal'}
                    onChange={(event) => setPayload((current) => ({
                      ...current,
                      dossier: { ...current.dossier, opsPriority: event.target.value },
                    }))}
                  >
                    {Object.entries(OPS_PRIORITY_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <Button type="button" onClick={() => void saveAssignment()} disabled={saving}>
                {saving ? 'Enregistrement…' : 'Enregistrer'}
              </Button>
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-5 py-4">
              <h3 className="text-lg font-extrabold text-slate-900">Messages client</h3>
              <p className="text-sm text-slate-500">Fil partagé avec le client — envoi email direct possible.</p>
            </div>
            <div className="p-5">
              <DossierMessageThread
                messages={messages}
                loading={messagesLoading}
                viewerRole="ops"
                clientEmail={ownerEmail}
                onSend={async (body) => {
                  await sendDossierMessageOptimistic({
                    dossierId: dossier.id,
                    body,
                    setMessages,
                    postMessage: postOpsDossierMessage,
                    authorType: 'ops',
                    authorName: 'Équipe Greffio',
                  });
                }}
                onSendEmail={async ({ body, toEmail, subject }) => {
                  const result = await sendOpsDossierMessageEmail(dossier.id, { body, toEmail, subject });
                  setMessages(result?.messages || []);
                }}
              />
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-5 py-4">
              <h3 className="text-lg font-extrabold text-slate-900">Notes internes</h3>
            </div>
            <div className="space-y-3 p-5">
              <div className="flex gap-2">
                <Input value={newNote} onChange={(event) => setNewNote(event.target.value)} placeholder="Note ops…" />
                <Button type="button" onClick={() => void addNote()}>Ajouter</Button>
              </div>
              {notes.length ? notes.map((note) => (
                <div key={note.id} className="rounded-lg bg-slate-50 p-3">
                  <p className="text-sm text-slate-800">{note.note}</p>
                  <p className="mt-1 text-xs text-slate-500">{formatDateTime(note.createdAt)}</p>
                </div>
              )) : <p className="text-sm text-slate-500">Aucune note.</p>}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
