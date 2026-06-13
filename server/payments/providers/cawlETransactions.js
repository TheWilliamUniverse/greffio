import crypto from 'node:crypto';
import fs from 'node:fs';
import { PAYMENT_STATUSES } from '../types.js';

/** Serveurs Up2pay e-Transactions — recette / sandbox (voir exemple PHP CAWL). */
export const ET_SERVERS_TEST = Object.freeze([
  'recette-tpeweb.e-transactions.fr',
]);

/** Serveurs Up2pay e-Transactions — production. */
export const ET_SERVERS_PRODUCTION = Object.freeze([
  'tpeweb.e-transactions.fr',
  'tpeweb1.e-transactions.fr',
]);

const DEFAULT_SIGN_KEYSIZE = '2048';
const DEFAULT_CURRENCY = '978'; // EUR ISO 4217 numeric
/** Endpoint Paybox System hosted checkout (doc Verifone / Paybox, pas /php/). */
export const DEFAULT_ET_CHECKOUT_PATH = '/cgi/MYchoix_pagepaiement.cgi';

/**
 * Lit la configuration CAWL e-Transactions depuis les variables d'environnement.
 * Aliases conservés pour compatibilité : CAWL_MERCHANT_ID → PBX_SITE, CAWL_API_KEY → HMAC.
 *
 * @param {NodeJS.ProcessEnv} [env]
 */
export function resolveCawlETransactionsConfig(env = process.env) {
  const mode = String(env.CAWL_ENV || 'test').trim().toLowerCase();
  const isTest = mode !== 'production';
  const apiBaseUrl = String(env.API_BASE_URL || 'http://localhost:8787').replace(/\/$/, '');
  const appUrl = String(env.APP_URL || 'https://greffio.willentreprises.com').replace(/\/$/, '');

  return {
    mode: isTest ? 'test' : 'production',
    isTest,
    pbxSite: String(env.CAWL_PBX_SITE || env.CAWL_MERCHANT_ID || '').trim(),
    pbxRang: String(env.CAWL_PBX_RANG || '').trim(),
    pbxIdentifiant: String(env.CAWL_PBX_IDENTIFIANT || env.CAWL_API_KEY_ID || '').trim(),
    hmacKeyHex: String(env.CAWL_HMAC_KEY || env.CAWL_API_KEY || '').trim(),
    signKeysize: String(env.CAWL_SIGN_KEYSIZE || DEFAULT_SIGN_KEYSIZE).trim(),
    ipnUrl: String(env.CAWL_IPN_URL || `${apiBaseUrl}/api/webhooks/cawl`).trim(),
    returnUrl: String(env.CAWL_RETURN_URL || `${appUrl}/paiement/verification`).trim(),
    cancelUrl: String(env.CAWL_CANCEL_URL || `${appUrl}/paiement`).trim(),
    refuseUrl: String(env.CAWL_REFUSE_URL || `${appUrl}/paiement/verification?status=refused`).trim(),
    pubkeyPath: String(env.CAWL_ETRANS_PUBKEY_PATH || '').trim(),
    checkoutPath: normalizeETransactionsCheckoutPath(
      env.CAWL_ETRANSACTIONS_CHECKOUT_PATH || env.CAWL_ETRANS_CHECKOUT_PATH,
    ),
    servers: isTest ? [...ET_SERVERS_TEST] : [...ET_SERVERS_PRODUCTION],
  };
}

/**
 * Normalise le chemin POST Paybox (doit commencer par /, ex. /cgi/MYchoix_pagepaiement.cgi).
 * @param {string} [rawPath]
 */
export function normalizeETransactionsCheckoutPath(rawPath) {
  const trimmed = String(rawPath || DEFAULT_ET_CHECKOUT_PATH).trim();
  if (!trimmed) return DEFAULT_ET_CHECKOUT_PATH;
  const withLeadingSlash = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  if (withLeadingSlash === '/php/' || withLeadingSlash === '/php') {
    return DEFAULT_ET_CHECKOUT_PATH;
  }
  return withLeadingSlash;
}

/**
 * @param {string} serverHost
 * @param {ReturnType<typeof resolveCawlETransactionsConfig>} config
 */
export function buildETransactionsCheckoutActionUrl(serverHost, config) {
  const host = String(serverHost || '').trim();
  const path = normalizeETransactionsCheckoutPath(config?.checkoutPath);
  return `https://${host}${path}`;
}

/** @param {NodeJS.ProcessEnv} [env] */
export function isCawlETransactionsConfigured(env = process.env) {
  const cfg = resolveCawlETransactionsConfig(env);
  return Boolean(cfg.pbxSite && cfg.pbxRang && cfg.pbxIdentifiant && cfg.hmacKeyHex);
}

/**
 * Formate une valeur pour PBX_BILLING (translittération simplifiée, ASCII majuscules).
 * @param {string} value
 * @param {number} maxLength
 */
export function formatEtField(value, maxLength) {
  const normalized = String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return normalized.slice(0, maxLength).trim();
}

/** @param {number} [quantity] */
export function buildShoppingCartXml(quantity = 1) {
  const qty = Math.max(1, Math.min(999, Math.round(Number(quantity) || 1)));
  return `<?xml version="1.0" encoding="utf-8"?><shoppingcart><total><totalQuantity>${qty}</totalQuantity></total></shoppingcart>`;
}

/**
 * @param {Object} [billing]
 * @param {string} [billing.firstName]
 * @param {string} [billing.lastName]
 * @param {string} [billing.address1]
 * @param {string} [billing.address2]
 * @param {string} [billing.zipCode]
 * @param {string} [billing.city]
 * @param {string} [billing.countryCode]
 * @param {string} [billing.mobilePhone]
 */
export function buildBillingXml(billing = {}) {
  const firstName = formatEtField(billing.firstName || 'CLIENT', 22);
  const lastName = formatEtField(billing.lastName || 'GREFFIO', 22);
  const address1 = formatEtField(billing.address1 || '1 RUE GREFFIO', 50);
  const address2 = formatEtField(billing.address2 || '', 50);
  const zipCode = formatEtField(billing.zipCode || '75001', 16);
  const city = formatEtField(billing.city || 'PARIS', 50);
  const countryCode = formatEtField(billing.countryCode || '250', 3);
  const countryCodeMobilePhone = String(billing.countryCodeMobilePhone || '+33').trim();
  const mobilePhone = String(billing.mobilePhone || '0600000000').replace(/\D/g, '').slice(0, 15);

  return `<?xml version="1.0" encoding="utf-8"?><Billing><Address><FirstName>${firstName}</FirstName>`
    + `<LastName>${lastName}</LastName><Address1>${address1}</Address1>`
    + `<Address2>${address2}</Address2><ZipCode>${zipCode}</ZipCode>`
    + `<City>${city}</City><CountryCode>${countryCode}</CountryCode>`
    + `<CountryCodeMobilePhone>${countryCodeMobilePhone}</CountryCodeMobilePhone><MobilePhone>${mobilePhone}</MobilePhone>`
    + '</Address></Billing>';
}

/** Montant en centimes → chaîne PBX_TOTAL (sans séparateur). */
export function formatPbxTotal(amountCents) {
  const cents = Math.max(100, Math.round(Number(amountCents) || 0));
  return String(cents);
}

/**
 * Calcule PBX_HMAC (SHA512, clé hex → binaire) comme l'exemple PHP CAWL.
 * @param {string} message
 * @param {string} hexKey
 */
export function computeHmacSha512(message, hexKey) {
  const keyBuffer = Buffer.from(hexKey, 'hex');
  return crypto.createHmac('sha512', keyBuffer).update(message).digest('hex').toUpperCase();
}

/**
 * Construit la chaîne à hasher dans l'ordre imposé par e-Transactions.
 * @param {Record<string, string>} fields
 */
export function buildHmacMessage(fields) {
  const orderedKeys = [
    'PBX_SITE',
    'PBX_RANG',
    'PBX_IDENTIFIANT',
    'PBX_TOTAL',
    'PBX_DEVISE',
    'PBX_CMD',
    'PBX_PORTEUR',
    'PBX_REPONDRE_A',
    'PBX_RETOUR',
    'PBX_EFFECTUE',
    'PBX_ANNULE',
    'PBX_REFUSE',
    'PBX_HASH',
    'PBX_TIME',
    'PBX_SHOPPINGCART',
    'PBX_BILLING',
    'PBX_SOUHAITAUTHENT',
    'PBX_SIGN_KEYSIZE',
  ];
  return orderedKeys.map((key) => `${key}=${fields[key] ?? ''}`).join('&');
}

/**
 * Choisit un serveur e-Transactions disponible (load.html → #server_status OK).
 * En recette, retombe sur le premier serveur si le health-check échoue.
 * @param {string[]} servers
 * @param {typeof fetch} [fetchImpl]
 */
export async function pickETransactionsServer(servers, fetchImpl = globalThis.fetch) {
  for (const host of servers) {
    try {
      const response = await fetchImpl(`https://${host}/load.html`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });
      if (!response.ok) continue;
      const html = await response.text();
      if (/server_status[^>]*>\s*OK\s*</i.test(html) || /id=["']server_status["'][^>]*>\s*OK/i.test(html)) {
        return host;
      }
    } catch (_error) {
      // serveur suivant
    }
  }
  return servers[0] || null;
}

/**
 * @param {Object} input
 * @param {string} input.internalPaymentId
 * @param {number} input.amountCents
 * @param {string} [input.customerEmail]
 * @param {string} [input.returnUrl]
 * @param {string} [input.cancelUrl]
 * @param {string} [input.refuseUrl]
 * @param {Object} [input.billing]
 * @param {number} [input.cartQuantity]
 * @param {ReturnType<typeof resolveCawlETransactionsConfig>} config
 * @param {string} serverHost
 */
export function buildHostedCheckoutFields(input, config, serverHost) {
  const pbxTotal = formatPbxTotal(input.amountCents);
  const pbxTime = new Date().toISOString();
  const pbxShoppingcart = buildShoppingCartXml(input.cartQuantity || 1);
  const pbxBilling = buildBillingXml(input.billing);
  const pbxSouhaitauthent = Number(pbxTotal) > 10000 ? '01' : '02';
  const customerEmail = String(input.customerEmail || `paiement+${input.internalPaymentId.slice(0, 8)}@greffio.fr`).trim();

  const fields = {
    PBX_SITE: config.pbxSite,
    PBX_RANG: config.pbxRang,
    PBX_IDENTIFIANT: config.pbxIdentifiant,
    PBX_TOTAL: pbxTotal,
    PBX_DEVISE: DEFAULT_CURRENCY,
    PBX_CMD: input.internalPaymentId,
    PBX_PORTEUR: customerEmail,
    PBX_REPONDRE_A: config.ipnUrl,
    PBX_RETOUR: 'Mt:M;Ref:R;Auto:A;Erreur:E',
    PBX_EFFECTUE: input.returnUrl || config.returnUrl,
    PBX_ANNULE: input.cancelUrl || config.cancelUrl,
    PBX_REFUSE: input.refuseUrl || config.refuseUrl,
    PBX_HASH: 'SHA512',
    PBX_TIME: pbxTime,
    PBX_SHOPPINGCART: pbxShoppingcart,
    PBX_BILLING: pbxBilling,
    PBX_SOUHAITAUTHENT: pbxSouhaitauthent,
    PBX_SIGN_KEYSIZE: config.signKeysize,
  };

  const msg = buildHmacMessage(fields);
  fields.PBX_HMAC = computeHmacSha512(msg, config.hmacKeyHex);

  return {
    actionUrl: buildETransactionsCheckoutActionUrl(serverHost, config),
    fields,
    mode: config.mode,
    serverHost,
  };
}

/**
 * Génère la page HTML de redirection POST (hosted checkout e-Transactions).
 * @param {{ actionUrl: string, fields: Record<string, string> }} payload
 */
export function renderHostedCheckoutHtml(payload) {
  const inputs = Object.entries(payload.fields)
    .map(([name, value]) => `<input type="hidden" name="${escapeHtml(name)}" value="${escapeHtml(value)}">`)
    .join('\n');
  const actionUrl = escapeHtml(payload.actionUrl);

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Redirection paiement sécurisé…</title>
  <style>
    body{font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f8fbff;color:#1e4d8c}
    main{text-align:center;padding:2rem;max-width:28rem}
    button{margin-top:1rem;padding:0.75rem 1.25rem;border:0;border-radius:0.75rem;background:#1e4d8c;color:#fff;font:inherit;font-weight:700;cursor:pointer}
    #cawl-fallback{display:none;margin-top:1rem}
  </style>
  <script>
    (function () {
      function submitCheckout() {
        var form = document.getElementById('cawl-checkout');
        if (form) form.submit();
      }
      function showFallback() {
        var el = document.getElementById('cawl-fallback');
        if (el) el.style.display = 'block';
      }
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', submitCheckout);
      } else {
        submitCheckout();
      }
      window.addEventListener('load', submitCheckout);
      setTimeout(submitCheckout, 50);
      setTimeout(submitCheckout, 250);
      setTimeout(showFallback, 2500);
    })();
  </script>
</head>
<body onload="(function(){var f=document.getElementById('cawl-checkout');if(f)f.submit();})();">
  <main>
    <p>Redirection vers la page de paiement sécurisée CAWL…</p>
    <form id="cawl-checkout" method="POST" action="${actionUrl}">
      ${inputs}
      <noscript>
        <p><button type="submit">Continuer vers le paiement sécurisé</button></p>
      </noscript>
      <p id="cawl-fallback">
        <button type="submit">Continuer vers le paiement sécurisé</button>
      </p>
    </form>
  </main>
</body>
</html>`;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Vérifie la signature RSA de l'IPN e-Transactions (champ Sign en dernier).
 * @param {string} queryString Chaîne complète (sans ?), Sign en dernière paire.
 * @param {string} pubkeyPath Chemin vers pubkey RSA PEM (2048 bits).
 */
export function verifyETransactionsIpnSignature(queryString, pubkeyPath) {
  if (!queryString || !pubkeyPath) return { ok: false, reason: 'ETRANS_SIGN_INPUT_MISSING' };
  if (!fs.existsSync(pubkeyPath)) return { ok: false, reason: 'ETRANS_PUBKEY_NOT_FOUND' };

  const lastAmp = queryString.lastIndexOf('&');
  if (lastAmp < 0) return { ok: false, reason: 'ETRANS_SIGN_FORMAT_INVALID' };

  const signedData = queryString.slice(0, lastAmp);
  const signPart = queryString.slice(lastAmp + 1);
  const eqIndex = signPart.indexOf('=');
  if (eqIndex < 0 || signPart.slice(0, eqIndex) !== 'Sign') {
    return { ok: false, reason: 'ETRANS_SIGN_FIELD_MISSING' };
  }

  const signature = Buffer.from(decodeURIComponent(signPart.slice(eqIndex + 1)), 'base64');
  const pem = fs.readFileSync(pubkeyPath, 'utf8');
  const valid = crypto.verify(
    'RSA-SHA1',
    Buffer.from(signedData, 'utf8'),
    pem,
    signature,
  );
  return valid ? { ok: true } : { ok: false, reason: 'ETRANS_SIGN_MISMATCH' };
}

/**
 * Mappe le code Erreur e-Transactions → statut interne Greffio.
 * 00000 = transaction acceptée (doc Up2pay).
 * @param {string|number} errorCode
 */
export function mapETransactionsErrorCode(errorCode) {
  const code = String(errorCode || '').trim();
  if (code === '00000') return PAYMENT_STATUSES.PAID;
  if (['00001', '00002', '00003', '00004', '00005', '00006', '00007', '00008'].includes(code)) {
    return PAYMENT_STATUSES.FAILED;
  }
  if (code === '00003') return PAYMENT_STATUSES.CANCELLED;
  return PAYMENT_STATUSES.FAILED;
}

/**
 * Parse un corps IPN e-Transactions (query string ou objet plat).
 * @param {string|Record<string, string>} payload
 */
export function parseETransactionsIpn(payload) {
  const params = typeof payload === 'string'
    ? Object.fromEntries(new URLSearchParams(payload))
    : { ...payload };

  const providerPaymentId = params.Ref || params.ref || params.PBX_CMD || null;
  const status = mapETransactionsErrorCode(params.Erreur || params.erreur);
  return {
    providerPaymentId,
    status,
    amount: params.Mt || params.mt || null,
    authNumber: params.Auto || params.auto || null,
    errorCode: params.Erreur || params.erreur || null,
    raw: params,
  };
}
