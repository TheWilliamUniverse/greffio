/** Affiche une référence commande côté client – jamais d'UUID brut. */
export const formatOrderPublicReference = (order) => {
  if (!order) return null;
  const ref = order.publicReference || order.metadata?.publicReference;
  if (ref) return ref.startsWith('#') ? ref : `#${ref}`;
  if (order.serviceTitle && order.createdAt) {
    const date = new Date(order.createdAt).toLocaleDateString('fr-FR');
    return `${order.serviceTitle} – ${date}`;
  }
  return null;
};

export const formatOrderStatusLabel = (status) => {
  const map = {
    draft: 'Brouillon',
    pending_payment: 'En attente de paiement',
    paid: 'Payée',
    processing: 'En cours de traitement',
    completed: 'Livrée',
    cancelled: 'Annulée',
  };
  return map[status] || 'En cours';
};

export const formatPaymentStatusLabel = (status, { refundPending = false } = {}) => {
  if (refundPending) return 'Remboursement en cours';
  const map = {
    refunded: 'Remboursé',
    partially_refunded: 'Partiellement remboursé',
    paid: 'Payé',
    failed: 'Échoué',
    cancelled: 'Annulé',
    pending: 'En attente',
    processing: 'En cours',
  };
  return map[status] || null;
};

/** Priorise le statut remboursement paiement sur le statut commande quand applicable. */
export const resolveOrderStatusDisplay = (order) => {
  if (!order) {
    return { label: 'En cours', tone: 'order' };
  }

  if (order.refundPending) {
    return { label: formatPaymentStatusLabel(null, { refundPending: true }), tone: 'refund-pending' };
  }

  const paymentLabel = formatPaymentStatusLabel(order.paymentStatus);
  if (paymentLabel && ['refunded', 'partially_refunded'].includes(order.paymentStatus)) {
    return {
      label: paymentLabel,
      tone: order.paymentStatus === 'partially_refunded' ? 'partial-refund' : 'refunded',
    };
  }

  return {
    label: formatOrderStatusLabel(order.status),
    tone: 'order',
  };
};

export const orderStatusDisplayToneClass = (tone) => {
  if (tone === 'refunded') return 'bg-slate-100 text-slate-700 border-slate-200';
  if (tone === 'partial-refund') return 'bg-orange-50 text-orange-900 border-orange-200';
  if (tone === 'refund-pending') return 'bg-amber-50 text-amber-900 border-amber-200';
  return null;
};
