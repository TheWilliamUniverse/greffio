import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CalendarClock, CheckCircle2, CircleDollarSign, FolderKanban, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { StatusBadge } from '@/components/StatusBadge.jsx';
import { Input } from '@/components/ui/input.jsx';
import {
  createOpsNote,
  getOpsDossierDetail,
  getOpsDossiers,
  getOpsPayments,
  updateOpsAssignment,
} from '@/api/ops.js';

const Card = ({ title, value, icon: Icon, tone = 'default' }) => (
  <div className="rounded-md border border-border bg-white p-5 shadow-elevation-sm">
    <div className="flex items-center justify-between gap-3">
      <p className="text-sm font-semibold text-muted-foreground">{title}</p>
      <Icon className={`h-5 w-5 ${tone === 'success' ? 'text-emerald-600' : tone === 'warning' ? 'text-amber-600' : 'text-primary'}`} />
    </div>
    <p className="mt-3 text-3xl font-extrabold text-foreground">{value}</p>
  </div>
);

const fmtEuros = (cents) => `${(Number(cents || 0) / 100).toFixed(2)} €`;

export const OpsDashboardPage = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dossiers, setDossiers] = useState([]);
  const [payments, setPayments] = useState([]);
  const [selectedDossier, setSelectedDossier] = useState(null);
  const [selectedDocuments, setSelectedDocuments] = useState([]);
  const [selectedEvents, setSelectedEvents] = useState([]);
  const [selectedNotes, setSelectedNotes] = useState([]);
  const [newNote, setNewNote] = useState('');
  const [opsFilter, setOpsFilter] = useState('all');
  const [savingAssignment, setSavingAssignment] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [dossiersPayload, paymentsPayload] = await Promise.all([
        getOpsDossiers(),
        getOpsPayments(),
      ]);
      setDossiers(dossiersPayload.dossiers || []);
      setPayments(paymentsPayload.payments || []);
    } catch (_e) {
      setError("Impossible de charger les données Ops.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const paidPayments = payments.filter((item) => item.status === 'paid');
  const pendingPayments = payments.filter((item) => item.status !== 'paid');
  const paidVolume = paidPayments.reduce((sum, item) => sum + Number(item.amountTotalCents || 0), 0);

  const filteredDossiers = useMemo(() => {
    if (opsFilter === 'all') return dossiers;
    return dossiers.filter((item) => (item.opsQueue || 'waiting_client') === opsFilter);
  }, [dossiers, opsFilter]);

  const openDossier = async (dossierId) => {
    try {
      const payload = await getOpsDossierDetail(dossierId);
      setSelectedDossier(payload.dossier || null);
      setSelectedDocuments(payload.documents || []);
      setSelectedEvents(payload.events || []);
      setSelectedNotes(payload.notes || []);
    } catch (_e) {
      setError("Impossible d'ouvrir le dossier Ops.");
    }
  };

  const saveAssignment = async () => {
    if (!selectedDossier) return;
    try {
      setSavingAssignment(true);
      const payload = await updateOpsAssignment({
        dossierId: selectedDossier.id,
        assignedToUserId: selectedDossier.assignedToUserId || null,
        opsQueue: selectedDossier.opsQueue || 'waiting_client',
        opsPriority: selectedDossier.opsPriority || 'normal',
      });
      setSelectedDossier(payload.dossier || selectedDossier);
      await loadData();
    } catch (_e) {
      setError('Impossible de sauvegarder l’assignation.');
    } finally {
      setSavingAssignment(false);
    }
  };

  const addNote = async () => {
    if (!selectedDossier || !newNote.trim()) return;
    try {
      const payload = await createOpsNote({
        dossierId: selectedDossier.id,
        note: newNote.trim(),
      });
      setSelectedNotes(payload.notes || []);
      setNewNote('');
    } catch (_e) {
      setError("Impossible d'ajouter la note.");
    }
  };

  return (
    <main className="min-h-screen bg-background px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-bold uppercase text-primary">Ops</p>
            <h1 className="mt-1 text-3xl font-extrabold">Pilotage opérationnel Greffio</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Vue rapide dossiers/paiements branchée sur l’API.
            </p>
          </div>
          <Button type="button" variant="outline" className="bg-white" onClick={loadData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
        </div>

        {error && (
          <div className="rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">
            {error}
          </div>
        )}

        <section className="grid gap-4 md:grid-cols-4">
          <Card title="Dossiers" value={dossiers.length} icon={FolderKanban} />
          <Card title="Paiements totaux" value={payments.length} icon={CircleDollarSign} />
          <Card title="Paiements validés" value={paidPayments.length} icon={CheckCircle2} tone="success" />
          <Card title="Paiements en attente" value={pendingPayments.length} icon={AlertCircle} tone="warning" />
        </section>

        <section className="rounded-md border border-border bg-white p-5 shadow-elevation-sm">
          <p className="text-sm font-semibold text-muted-foreground">Volume encaissé</p>
          <p className="mt-2 text-2xl font-extrabold text-foreground">{fmtEuros(paidVolume)}</p>
        </section>

        <section className="rounded-md border border-border bg-white shadow-elevation-sm">
          <div className="border-b border-border p-4">
            <h2 className="text-lg font-extrabold">Dossiers</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {[
                ['all', 'Tous'],
                ['blocked', 'Bloqué'],
                ['waiting_client', 'En attente client'],
                ['ready_to_file', 'Prêt dépôt'],
              ].map(([value, label]) => (
                <Button key={value} type="button" variant={opsFilter === value ? 'default' : 'outline'} className="bg-white" onClick={() => setOpsFilter(value)}>
                  {label}
                </Button>
              ))}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted text-left">
                  <th className="px-4 py-3 font-semibold">ID</th>
                  <th className="px-4 py-3 font-semibold">Société</th>
                  <th className="px-4 py-3 font-semibold">Forme</th>
                  <th className="px-4 py-3 font-semibold">Statut</th>
                  <th className="px-4 py-3 font-semibold">File Ops</th>
                  <th className="px-4 py-3 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredDossiers.map((item) => (
                  <tr key={item.id} className="border-t border-border">
                    <td className="px-4 py-3 font-mono text-xs">{item.id}</td>
                    <td className="px-4 py-3">{item.companyName}</td>
                    <td className="px-4 py-3">{item.legalForm}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-muted px-2 py-1 text-xs font-bold">{item.status}</span>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={String(item.opsQueue || 'waiting_client').toUpperCase()} />
                    </td>
                    <td className="px-4 py-3">
                      <Button type="button" variant="outline" className="bg-white" onClick={() => openDossier(item.id)}>
                        Ouvrir cockpit
                      </Button>
                    </td>
                  </tr>
                ))}
                {!filteredDossiers.length && (
                  <tr>
                    <td className="px-4 py-4 text-muted-foreground" colSpan={6}>Aucun dossier pour le moment.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {selectedDossier ? (
          <section className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-md border border-border bg-white shadow-elevation-sm">
              <div className="border-b border-border p-4">
                <h2 className="text-lg font-extrabold">Pilotage dossier {selectedDossier.reference || selectedDossier.id}</h2>
                <p className="mt-1 text-xs text-muted-foreground">{selectedDossier.companyName}</p>
              </div>
              <div className="space-y-4 p-4">
                <div>
                  <p className="mb-1 text-xs font-bold uppercase text-muted-foreground">Assignation formaliste</p>
                  <Input value={selectedDossier.assignedToUserId || ''} onChange={(event) => setSelectedDossier((current) => ({ ...current, assignedToUserId: event.target.value }))} placeholder="ID formaliste (usr_...)" />
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <p className="mb-1 text-xs font-bold uppercase text-muted-foreground">File Ops</p>
                    <select className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm" value={selectedDossier.opsQueue || 'waiting_client'} onChange={(event) => setSelectedDossier((current) => ({ ...current, opsQueue: event.target.value }))}>
                      <option value="blocked">Bloqué</option>
                      <option value="waiting_client">En attente client</option>
                      <option value="ready_to_file">Prêt dépôt</option>
                    </select>
                  </div>
                  <div>
                    <p className="mb-1 text-xs font-bold uppercase text-muted-foreground">Priorité</p>
                    <select className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm" value={selectedDossier.opsPriority || 'normal'} onChange={(event) => setSelectedDossier((current) => ({ ...current, opsPriority: event.target.value }))}>
                      <option value="low">Basse</option>
                      <option value="normal">Normale</option>
                      <option value="high">Haute</option>
                      <option value="urgent">Urgente</option>
                    </select>
                  </div>
                </div>
                <Button type="button" onClick={saveAssignment} disabled={savingAssignment}>
                  {savingAssignment ? 'Sauvegarde...' : 'Enregistrer assignation'}
                </Button>
              </div>
            </div>

            <div className="rounded-md border border-border bg-white shadow-elevation-sm">
              <div className="border-b border-border p-4">
                <h2 className="text-lg font-extrabold">Notes Ops</h2>
              </div>
              <div className="space-y-3 p-4">
                <div className="flex gap-2">
                  <Input value={newNote} onChange={(event) => setNewNote(event.target.value)} placeholder="Ajouter une note interne..." />
                  <Button type="button" onClick={addNote}>Ajouter</Button>
                </div>
                {selectedNotes.length ? selectedNotes.map((note) => (
                  <div key={note.id} className="rounded-md bg-muted p-3">
                    <p className="text-sm">{note.note}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{new Date(note.createdAt).toLocaleString('fr-FR')}</p>
                  </div>
                )) : <p className="text-sm text-muted-foreground">Aucune note pour ce dossier.</p>}
              </div>
            </div>

            <div className="rounded-md border border-border bg-white shadow-elevation-sm">
              <div className="border-b border-border p-4">
                <h2 className="text-lg font-extrabold">Timeline dossier</h2>
              </div>
              <div className="space-y-3 p-4">
                {selectedEvents.length ? selectedEvents.map((event) => (
                  <div key={event.id} className="flex gap-3 rounded-md bg-muted p-3">
                    <CalendarClock className="mt-0.5 h-4 w-4 text-primary" />
                    <div>
                      <p className="text-sm font-semibold">{event.toStatus || event.reason || 'Événement'}</p>
                      <p className="text-xs text-muted-foreground">{event.actorType} · {new Date(event.createdAt).toLocaleString('fr-FR')}</p>
                    </div>
                  </div>
                )) : <p className="text-sm text-muted-foreground">Aucun événement.</p>}
              </div>
            </div>

            <div className="rounded-md border border-border bg-white shadow-elevation-sm">
              <div className="border-b border-border p-4">
                <h2 className="text-lg font-extrabold">Documents dossier</h2>
              </div>
              {selectedDocuments.length ? selectedDocuments.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between border-b border-border px-4 py-3 last:border-b-0">
                  <div>
                    <p className="text-sm font-bold">{doc.label}</p>
                    <p className="text-xs text-muted-foreground">{doc.docKey} · {doc.filename || 'non uploadé'}</p>
                    {doc.metadata?.analysis ? (
                      <p className="mt-1 text-xs font-semibold text-primary">
                        Analyse identité: {doc.metadata.analysis.docCategory || 'N/A'} ·
                        confiance {doc.metadata.analysis.confidence ?? 'N/A'}% ·
                        {doc.metadata.analysis.requiresManualReview ? ' contrôle manuel requis' : ' auto validé'}
                      </p>
                    ) : null}
                  </div>
                  <StatusBadge status={String(doc.status || '').toUpperCase()} />
                </div>
              )) : <div className="px-4 py-4 text-sm text-muted-foreground">Aucun document pour ce dossier.</div>}
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
};
