/** Référence publique lisible pour commandes boutique (ex. GRF-2026-0042). */
export const makeResourceOrderPublicReference = () => {
  const year = new Date().getFullYear();
  const seq = String(Math.floor(Math.random() * 9000) + 1000);
  return `GRF-${year}-${seq}`;
};

export const resolveResourceOrderPublicReference = (order) => {
  const fromMeta = order?.metadata?.publicReference;
  if (fromMeta) return fromMeta;
  if (order?.publicReference) return order.publicReference;
  if (order?.serviceTitle && order?.createdAt) {
    const date = new Date(order.createdAt).toLocaleDateString('fr-FR');
    return `${order.serviceTitle} – ${date}`;
  }
  return null;
};
