import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, CalendarClock, CheckCircle2, CircleDollarSign, Eye, FileText, FolderKanban, Loader2, RefreshCw, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button.jsx';
import { ConfirmActionDialog } from '@/components/ConfirmActionDialog.jsx';
import { StatusBadge } from '@/components/StatusBadge.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Textarea } from '@/components/ui/textarea.jsx';
import {
  createOpsNote,
  deleteOpsDocument,
  deleteOpsDossier,
  downloadOpsDocument,
  getOpsDossierDetail,
  getOpsDossiers,
  getOpsDossiersRisk,
  getOpsPayments,
  deleteOpsResourceOrder,
  getOpsResourceOrders,
  updateOpsDocumentStatus,
  updateOpsResourceOrderStatus,
  updateOpsAssignment,
} from '@/api/ops.js';
import { getDocumentTypeLabel } from '@/utils/documentStatusLabels.js';
import { useAuth } from '@/hooks/useAuth.js';

const opsDocumentHasFile = (doc) => Boolean(doc?.storageUrl || (doc?.filename && doc.filename !== 'non uploadé'));

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

const OPS_DELETABLE_STATUSES = new Set(['draft', 'pending_payment', 'cancelled']);

export const OpsDashboardPage = () => {
  const { currentUser } = useAuth();
  const isAdmin = String(currentUser?.role || '').toUpperCase() === 'ADMIN';
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
  const [docUpdating, setDocUpdating] = useState('');
  const [docPreviewing, setDocPreviewing] = useState('');
  const [docDeleting, setDocDeleting] = useState('');
  const [docToDelete, setDocToDelete] = useState(null);
  const [dossierDeleteOpen, setDossierDeleteOpen] = useState(false);
  const [dossierDeleting, setDossierDeleting] = useState(false);
  const [rejectingDocKey, setRejectingDocKey] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [deletingResourceOrderId, setDeletingResourceOrderId] = useState(null);

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

  const removeResourceOrder = async (orderId) => {
    if (!window.confirm('Supprimer cette commande ressource ?')) return;
    setDeletingResourceOrderId(orderId);
    try {
      await deleteOpsResourceOrder(orderId);
      setResourceOrders((current) => current.filter((order) => order.id !== orderId));
      toast.success('Commande supprimée');
    } catch (error) {
      toast.error(error?.message === 'ORDER_NOT_CANCELLABLE'
        ? 'Cette commande ne peut pas être supprimée.'
        : 'Suppression impossible.');
    } finally {
      setDeletingResourceOrderId(null);
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

  const openOpsDocumentPreview = async (docKey) => {
    if (!selectedDossier?.id) return;
    setDocPreviewing(docKey);
    setError('');
    try {
      const { blob } = await downloadOpsDocument({
        dossierId: selectedDossier.id,
        docKey,
        inline: true,
        cacheBust: true,
      });
      const url = window.URL.createObjectURL(blob);
      const previewWindow = window.open(url, '_blank', 'noopener,noreferrer');
      if (!previewWindow) {
        window.URL.revokeObjectURL(url);
        setError('Autorisez les pop-ups pour ouvrir l’aperçu du document.');
        return;
      }
      setTimeout(() => window.URL.revokeObjectURL(url), 120_000);
    } catch (_e) {
      setError('Impossible d’ouvrir ce document pour le moment.');
    } finally {
      setDocPreviewing('');
    }
  };

  const setDocumentStatus = async (docKey, status, rejectedReason = null) => {
    if (!selectedDossier?.id) return;
    setDocUpdating(docKey);
    setError('');
    try {
      const result = await updateOpsDocumentStatus({
        dossierId: selectedDossier.id,
        docKey,
        status,
        rejectedReason,
      });
      setSelectedDocuments(result.documents || []);
      setRejectingDocKey('');
      setRejectReason('');
      toast.success(status === 'valid' ? 'Document validé' : 'Document rejeté');
    } catch (err) {
      const code = err?.payload?.error || err?.message;
      setError(code === 'AUTH_SESSION_EXPIRED'
        ? 'Session expirée. Reconnectez-vous puis réessayez.'
        : 'Impossible de mettre à jour le document.');
      toast.error('Validation impossible pour le moment.');
    } finally {
      setDocUpdating('');
    }
  };

  const confirmDeleteDocument = async () => {
    if (!docToDelete || !selectedDossier?.id) return;
    const { docKey, label } = docToDelete;
    setDocToDelete(null);
    setDocDeleting(docKey);
    setError('');
    try {
      const result = await deleteOpsDocument({ dossierId: selectedDossier.id, docKey });
      setSelectedDocuments(result.documents || []);
      toast.success(`Pièce « ${label} » supprimée.`);
    } catch (_err) {
      setError('Impossible de supprimer cette pièce pour le moment.');
      toast.error('Suppression impossible pour le moment.');
    } finally {
      setDocDeleting('');
    }
  };

  const confirmDeleteDossier = async () => {
    if (!selectedDossier?.id) return;
    setDossierDeleteOpen(false);
    setDossierDeleting(true);
    setError('');
    try {
      await deleteOpsDossier(selectedDossier.id);
      setSelectedDossier(null);
      setSelectedDocuments([]);
      setSelectedEvents([]);
      setSelectedNotes([]);
      await loadData();
      toast.success('Dossier placé en corbeille.');
    } catch (_err) {
      setError('Impossible de supprimer ce dossier pour le moment.');
      toast.error('Suppression du dossier impossible.');
    } finally {
      setDossierDeleting(false);
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
                      <div className="flex flex-wrap gap-2">
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
                        {OPS_DELETABLE_STATUSES.has(order.status) ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="bg-white text-red-700 hover:bg-red-50"
                            disabled={deletingResourceOrderId === order.id}
                            onClick={() => void removeResourceOrder(order.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                            Supprimer
                          </Button>
                        ) : null}
                      </div>
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
              {selectedDocuments.length ? selectedDocuments.map((doc) => {
                const docStatus = String(doc.status || '').toLowerCase();
                const isRejecting = rejectingDocKey === doc.docKey;
                const showReviewActions = docStatus === 'uploaded' || docStatus === 'under_review';
                return (
                  <div key={doc.id} className="border-b border-border px-4 py-3 last:border-b-0">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-bold">{getDocumentTypeLabel(doc.docKey, doc.label)}</p>
                        <p className="text-xs text-muted-foreground">{doc.docKey} · {doc.filename || 'non uploadé'}</p>
                        {doc.rejectedReason ? (
                          <p className="mt-1 text-xs text-rose-700">Motif : {doc.rejectedReason}</p>
                        ) : null}
                        {doc.metadata?.analysis ? (
                          <p className="mt-1 text-xs font-semibold text-primary">
                            Analyse identité: {doc.metadata.analysis.docCategory || 'N/A'} ·
                            confiance {doc.metadata.analysis.confidence ?? 'N/A'}% ·
                            {doc.metadata.analysis.requiresManualReview ? ' contrôle manuel requis' : ' auto validé'}
                          </p>
                        ) : null}
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge status={String(doc.status || '').toUpperCase()} />
                        {opsDocumentHasFile(doc) ? (
                          <>
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
                            <Button
                              type="button"
                              size="icon"
                              variant="outline"
                              className="h-8 w-8 border-red-200 bg-white text-red-700 hover:bg-red-50"
                              aria-label="Supprimer la pièce jointe"
                              title="Supprimer la pièce jointe"
                              disabled={docDeleting === doc.docKey || docUpdating === doc.docKey}
                              onClick={() => setDocToDelete({
                                docKey: doc.docKey,
                                label: getDocumentTypeLabel(doc.docKey, doc.label),
                                status: docStatus,
                              })}
                            >
                              {docDeleting === doc.docKey
                                ? <Loader2 className="h-4 w-4 animate-spin" />
                                : <Trash2 className="h-4 w-4" />}
                            </Button>
                          </>
                        ) : null}
                        {showReviewActions && !isRejecting ? (
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
                              onClick={() => {
                                setRejectingDocKey(doc.docKey);
                                setRejectReason('');
                              }}
                            >
                              Rejeter
                            </Button>
                          </>
                        ) : null}
                      </div>
                    </div>
                    {isRejecting ? (
                      <div className="mt-3 space-y-2 rounded-lg border border-rose-100 bg-rose-50/50 p-3">
                        <p className="text-xs font-semibold text-slate-700">Motif du refus (optionnel, visible par le client)</p>
                        <Textarea
                          value={rejectReason}
                          onChange={(event) => setRejectReason(event.target.value)}
                          placeholder="Ex. : pièce illisible, document expiré, nom ne correspond pas…"
                          rows={3}
                          className="bg-white text-sm"
                        />
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="destructive"
                            disabled={docUpdating === doc.docKey}
                            onClick={() => void setDocumentStatus(
                              doc.docKey,
                              'invalid',
                              rejectReason.trim() || null,
                            )}
                          >
                            Confirmer le refus
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="bg-white"
                            disabled={docUpdating === doc.docKey}
                            onClick={() => {
                              setRejectingDocKey('');
                              setRejectReason('');
                            }}
                          >
                            Annuler
                          </Button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                );
              }) : <div className="px-4 py-4 text-sm text-muted-foreground">Aucun document pour ce dossier.</div>}
            </div>

            {isAdmin ? (
              <div className="border-t border-red-200 bg-red-50/40 p-4">
                <div className="flex items-start gap-3">
                  <Trash2 className="mt-0.5 h-5 w-5 text-red-700" />
                  <div className="flex-1">
                    <p className="text-sm font-extrabold text-red-900">Suppression du dossier</p>
                    <p className="mt-1 text-sm leading-relaxed text-red-900/80">
                      Action réservée à l’administration. Corbeille 72 h, restauration possible par le client.
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      className="mt-3 border-red-300 bg-white text-red-700 hover:bg-red-50"
                      disabled={dossierDeleting}
                      onClick={() => setDossierDeleteOpen(true)}
                    >
                      <Trash2 className="h-4 w-4" />
                      {dossierDeleting ? 'Suppression…' : 'Supprimer le dossier'}
                    </Button>
                  </div>
                </div>
              </div>
            ) : null}
          </section>
        ) : null}
      </div>

      <ConfirmActionDialog
        open={Boolean(docToDelete)}
        onOpenChange={(open) => { if (!open) setDocToDelete(null); }}
        destructive
        loading={Boolean(docDeleting)}
        title="Supprimer cette pièce jointe ?"
        description={docToDelete?.status === 'valid'
          ? `« ${docToDelete?.label || 'Document'} » est validé. La pièce sera retirée du dossier et le client devra en déposer une nouvelle si nécessaire.`
          : `« ${docToDelete?.label || 'Document'} » sera retiré du dossier. Le client pourra en déposer une nouvelle.`}
        confirmLabel="Supprimer la pièce"
        onConfirm={() => { void confirmDeleteDocument(); }}
      />

      <ConfirmActionDialog
        open={dossierDeleteOpen}
        onOpenChange={setDossierDeleteOpen}
        destructive
        loading={dossierDeleting}
        title="Supprimer ce dossier ?"
        description={selectedDossier
          ? `Le dossier ${selectedDossier.reference || selectedDossier.id} (${selectedDossier.companyName || 'sans dénomination'}) sera placé en corbeille puis supprimé définitivement sous 72 h, sauf restauration par le client.`
          : 'Ce dossier sera placé en corbeille.'}
        confirmLabel="Supprimer le dossier"
        onConfirm={() => { void confirmDeleteDossier(); }}
      />
    </main>
  );
};
