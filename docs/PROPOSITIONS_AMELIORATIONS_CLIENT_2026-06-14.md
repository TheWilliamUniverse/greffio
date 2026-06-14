# Propositions d'améliorations client – 14 juin 2026

**Périmètre :** paiement Mollie mobile, boutique, UX paiement B2C, footer public.

---

## 1. Paiement Mollie dans l'app Android (Capacitor)

| Élément | Statut |
|---------|--------|
| Ouverture checkout via `CapApp.openUrl` (navigateur système / Custom Tabs) | ✅ Implémenté |
| Retour deep link `https://greffio.willentreprises.com/paiement/verification` | ✅ Via App Links existants |
| Handler `appUrlOpen` dans `MobileAppShell` | ✅ Déjà en place |
| `allowNavigation` Mollie dans `capacitor.config.remote.json` | ✅ Ajouté (fallback WebView) |
| Terminal mobile aligné desktop (Mollie seul, CGV) | ✅ |

**Fichiers clés :** `src/utils/paymentCheckoutNavigation.js`, `src/mobile/MobilePaymentPage.jsx`, `src/pages/PaymentPage.jsx`

---

## 2. Boutique – panier et mes commandes

| Fonctionnalité | Statut |
|----------------|--------|
| Panier local (`useShopCart`) | ✅ |
| Drawer panier + CGV | ✅ |
| Page Mes commandes (`/boutique/commandes`) | ✅ |
| Références publiques `GRF-YYYY-XXXX` (pas d'UUID) | ✅ |
| Lien paiement depuis commandes en attente | ✅ |

**Fichiers clés :** `src/hooks/useShopCart.js`, `src/components/boutique/*`, `src/pages/ClientOrdersPage.jsx`, `server/utils/resourceOrderReference.js`

---

## 3. Polish UI paiement

| Amélioration | Statut |
|--------------|--------|
| Checkbox CGU/CGV (`LegalAcceptanceCheckbox`) | ✅ |
| Masquage UUIDs sur vérification paiement | ✅ |
| Suppression références GoCardless / CAWL côté B2C UI | ✅ |
| Logos moyens de paiement footer landing | ✅ (`PaymentBrandBadges` + labels) |

---

## 4. Prochaines étapes suggérées (non bloquantes)

1. **Rebuild AAB Android** pour inclure le flux Mollie mobile (build > 1.2.15).
2. **Test E2E** : panier boutique → Mollie test → retour app → statut commande.
3. **Email** confirmation commande avec référence `GRF-*` plutôt que l'ID technique.
4. **iOS** : même `openPaymentCheckoutUrl` lors du démarrage App Store.

---

## 5. Déploiement

- **Frontend** : build Vite + déploiement Hostinger après commit.
- **Backend** : déployer si `resourceOrderStore.js` / références commandes pas encore en prod.
