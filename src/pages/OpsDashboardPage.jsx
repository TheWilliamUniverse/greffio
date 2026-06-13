import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, CalendarClock, CheckCircle2, CircleDollarSign, FileText, FolderKanban, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { StatusBadge } from '@/components/StatusBadge.jsx';
import { Input } from '@/components/ui/input.jsx';
import {
  createOpsNote,
  getOpsDossierDetail,
  getOpsDossiers,
  getOpsDossiersRisk,
  getOpsPayments,
  getOpsResourceOrders,
  updateOpsResourceOrderStatus,
  updateOpsAssignment,
} from '@/api/ops.js';
import { getDocumentTypeLabel } from '@/utils/documentStatusLabels.js';

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
  const [selectedRisk, setSelectedRisk] = useState(null);
  const [newNote, setNewNote] = useState('');
  const [opsFilter, setOpsFilter] = useState('all');
  const [savingAssignment, setSavingAssignment] = useState(false);
  const [antiRejectQueue, setAntiRejectQueue] = useState([]);
  const [resourceOrders, setResourceOrders] = useState([]);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [dossiersPayload, paymentsPayload, riskPayload, resourceOrdersPayload] = await Promise.all([
        getOpsDossiers(),
        getOpsPayments(),
        getOpsDossiersRisk(),
        getOpsResourceOrders().catch(() => ({ orders: [] })),
      ]);
      setDossiers(dossiersPayload.dossiers || []);
      setPayments(paymentsPayload.payments || []);
      setAntiRejectQueue(riskPayload.queue || []);
      setResourceOrders(resourceOrdersPayload.orders || []);
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
      setSelectedRisk(payload.risk || null);
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
              Vue rapide dossiers/paiements – accès global à tous les dossiers clients (hors assignation personnelle).
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

        <section id="resource-orders" className="rounded-md border border-border bg-white shadow-elevation-sm">
          <div className="border-b border-border p-4">
            <h2 className="text-lg font-extrabold">Commandes documents / ressources</h2>
            <p className="mt-1 text-xs text-muted-foreground">File manuelle OPS – Kbis, copies certifiées, packs.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50 text-left">
                  <th className="px-4 py-2 font-semibold">Service</th>
                  <th className="px-4 py-2 font-semibold">Entreprise</th>
                  <th className="px-4 py-2 font-semibold">Statut</th>
                  <th className="px-4 py-2 font-semibold">Montant</th>
                  <th className="px-4 py-2 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {resourceOrders.length ? resourceOrders.map((order) => (
                  <tr key={order.id} className="border-b border-border last:border-b-0">
                    <td className="px-4 py-3">
                      <p className="font-semibold">{order.serviceTitle}</p>
                      <p className="text-xs text-muted-foreground">{order.id}</p>
                    </td>
                    <td className="px-4 py-3">
                      {order.companyName || '–'}
                      {order.siren && <p className="text-xs text-muted-foreground">SIREN {order.siren}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={String(order.status || '').toUpperCase()} />
                      <p className="mt-1 text-xs text-muted-foreground">{order.fulfillmentMode}</p>
                    </td>
                    <td className="px-4 py-3">{fmtEuros(order.priceTtcCents)}</td>
                    <td className="px-4 py-3">
                      {order.status === 'paid' && (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => void updateOpsResourceOrderStatus(order.id, { status: 'processing' }).then(loadData)}
                        >
                          Traiter
                        </Button>
                      )}
                      {order.status === 'processing' && (
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => void updateOpsResourceOrderStatus(order.id, { status: 'completed' }).then(loadData)}
                        >
                          Terminer
                        </Button>
                      )}
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">
                      Aucune commande ressource pour le moment.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-md border border-border bg-white shadow-elevation-sm">
          <div className="border-b border-border p-4">
            <h2 className="text-lg font-extrabold">Queue Anti-Rejet (tri risque + délai + pièces)</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted text-left">
                  <th className="px-4 py-3 font-semibold">Dossier</th>
                  <th className="px-4 py-3 font-semibold">Risque</th>
                  <th className="px-4 py-3 font-semibold">Âge</th>
                  <th className="px-4 py-3 font-semibold">Pièces manquantes</th>
                  <th className="px-4 py-3 font-semibold">Blocage identité</th>
                  <th className="px-4 py-3 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {antiRejectQueue.slice(0, 20).map((item) => (
                  <tr key={item.dossier.id} className="border-t border-border">
                    <td className="px-4 py-3">
                      <p className="font-semibold">{item.dossier.companyName}</p>
                      <p className="text-xs text-muted-foreground">{item.dossier.id}</p>
                    </td>
                    <td className="px-4 py-3 font-bold">{item.risk.riskScore}/100</td>
                    <td className="px-4 py-3">{item.risk.dossierAgeDays} j</td>
                    <td className="px-4 py-3">{item.risk.requiredMissingCount}</td>
                    <td className="px-4 py-3">{item.risk.identityVerificationBlocked ? 'Oui' : 'Non'}</td>
                    <td className="px-4 py-3">
                      <Button type="button" variant="outline" className="bg-white" onClick={() => openDossier(item.dossier.id)}>
                        Ouvrir
                      </Button>
                    </td>
                  </tr>
                ))}
                {!antiRejectQueue.length ? (
                  <tr>
                    <td className="px-4 py-4 text-muted-foreground" colSpan={6}>Aucune donnée de risque disponible.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
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
                <div className="rounded-md border border-primary/20 bg-primary/5 p-3 text-xs text-muted-foreground">
                  <p className="font-semibold text-foreground">Formalités & statuts</p>
                  <p className="mt-1">L’équipe ops consulte et génère les statuts de tous les clients sans être rattachée au dossier. Seul le dossier WILLIAM ESTABLISHMENTS peut porter une assignation interne.</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button type="button" variant="outline" className="bg-white" asChild>
                      <Link to={`/statuts?dossierId=${selectedDossier.id}`}>
                        <FileText className="h-4 w-4" />
                        Statuts & exports
                      </Link>
                    </Button>
                    <Button type="button" variant="outline" className="bg-white" asChild>
                      <Link to={`/dossier/${selectedDossier.id}`}>
                        Ouvrir le dossier client
                      </Link>
                    </Button>
                  </div>
                </div>
                <div>
                  <p className="mb-1 text-xs font-bold uppercase text-muted-foreground">Assignation formaliste (optionnelle)</p>
                  <Input value={selectedDossier.assignedToUserId || ''} onChange={(event) => setSelectedDossier((current) => ({ ...current, assignedToUserId: event.target.value }))} placeholder="ID formaliste externe (usr_...) – laisser vide pour dossiers clients" />
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
                {selectedRisk ? (
                  <div className="rounded-md border border-border bg-muted p-3 text-xs text-muted-foreground">
                    <p><strong>Risque global:</strong> {selectedRisk.riskScore}/100</p>
                    <p><strong>Blocage identité:</strong> {selectedRisk.identityVerificationBlocked ? 'Oui' : 'Non'}</p>
                    <p><strong>Pièces manquantes:</strong> {selectedRisk.requiredMissingCount}</p>
                    <p><strong>Recommandation:</strong> {selectedRisk.recommendation}</p>
                  </div>
                ) : null}
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
                    <p className="text-sm font-bold">{getDocumentTypeLabel(doc.docKey, doc.label)}</p>
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
