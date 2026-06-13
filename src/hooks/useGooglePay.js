import { useCallback, useEffect, useMemo, useState } from 'react';
import { getGooglePayConfig } from '@/api/payments.js';
import { googlePayConfig } from '@/config/googlePay.js';

const SCRIPT_URL = 'https://pay.google.com/gp/p/js/pay.js';

let scriptPromise = null;

const loadGooglePayScript = () => {
  if (typeof window === 'undefined') return Promise.resolve(null);
  if (window.google?.payments?.api?.PaymentsClient) {
    return Promise.resolve(window.google.payments.api.PaymentsClient);
  }
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[src="${SCRIPT_URL}"]`);
      if (existing) {
        existing.addEventListener('load', () => resolve(window.google?.payments?.api?.PaymentsClient));
        existing.addEventListener('error', reject);
        return;
      }
      const script = document.createElement('script');
      script.src = SCRIPT_URL;
      script.async = true;
      script.onload = () => resolve(window.google?.payments?.api?.PaymentsClient);
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }
  return scriptPromise;
};

export const useGooglePay = ({ amountCents = 0, label = 'Greffio', active = true } = {}) => {
  const [ready, setReady] = useState(false);
  const [config, setConfig] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!active) return undefined;
    let cancelled = false;
    const boot = async () => {
      setReady(false);
      setError('');
      try {
        const [PaymentsClient, serverConfig] = await Promise.all([
          loadGooglePayScript(),
          getGooglePayConfig().catch(() => null),
        ]);
        if (cancelled || !PaymentsClient) return;
        const merged = {
          ...googlePayConfig,
          ...(serverConfig?.config || {}),
        };
        if (!merged.readyForPayment && !merged.enabled) {
          setError('Google Pay sera disponible dès branchement complet du prestataire carte.');
          return;
        }
        setConfig(merged);
        setReady(true);
      } catch (_err) {
        if (!cancelled) setError('Impossible de charger Google Pay.');
      }
    };
    void boot();
    return () => { cancelled = true; };
  }, [active]);

  const client = useMemo(() => {
    if (!ready || !config || !active || typeof window === 'undefined') return null;
    const PaymentsClient = window.google?.payments?.api?.PaymentsClient;
    if (!PaymentsClient) return null;
    return new PaymentsClient({ environment: config.environment || 'TEST' });
  }, [active, ready, config]);

  const paymentRequest = useMemo(() => {
    if (!config || !amountCents || !active) return null;
    const isTest = config.environment !== 'PRODUCTION';
    const gateway = isTest ? 'example' : String(config.gateway || 'cawl').toLowerCase();
    const gatewayMerchantId = isTest
      ? 'exampleGatewayMerchantId'
      : String(config.gatewayMerchantId || '').trim();

    if (!isTest && !gatewayMerchantId) return null;

    const merchantInfo = {
      merchantName: config.merchantName || 'Greffio',
    };
    if (!isTest && config.merchantId) {
      merchantInfo.merchantId = config.merchantId;
    }

    return {
      apiVersion: 2,
      apiVersionMinor: 0,
      allowedPaymentMethods: [{
        type: 'CARD',
        parameters: {
          allowedAuthMethods: ['PAN_ONLY', 'CRYPTOGRAM_3DS'],
          allowedCardNetworks: ['MASTERCARD', 'VISA'],
          billingAddressRequired: false,
        },
        tokenizationSpecification: {
          type: 'PAYMENT_GATEWAY',
          parameters: { gateway, gatewayMerchantId },
        },
      }],
      merchantInfo,
      transactionInfo: {
        totalPriceStatus: 'FINAL',
        totalPrice: (amountCents / 100).toFixed(2),
        currencyCode: config.currencyCode || 'EUR',
        countryCode: config.countryCode || 'FR',
        displayItems: [{
          label,
          type: 'LINE_ITEM',
          price: (amountCents / 100).toFixed(2),
        }],
      },
    };
  }, [active, amountCents, config, label]);

  const isReadyToPay = useCallback(async () => {
    if (!client || !paymentRequest) return false;
    try {
      const response = await client.isReadyToPay({
        apiVersion: 2,
        apiVersionMinor: 0,
        allowedPaymentMethods: paymentRequest.allowedPaymentMethods,
      });
      return Boolean(response?.result);
    } catch {
      return false;
    }
  }, [client, paymentRequest]);

  const pay = useCallback(async () => {
    if (!client || !paymentRequest) {
      throw new Error('GOOGLE_PAY_NOT_READY');
    }
    return client.loadPaymentData(paymentRequest);
  }, [client, paymentRequest]);

  return {
    client,
    config,
    ready,
    error,
    paymentRequest,
    isReadyToPay,
    pay,
  };
};
