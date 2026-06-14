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
