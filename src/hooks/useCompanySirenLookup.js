import { useEffect, useState } from 'react';
import { lookupCompanyBySiren } from '@/api/company.js';

export const sanitizeCompanyIdentifier = (value) => String(value || '').replace(/\D/g, '').slice(0, 14);

export const useCompanySirenLookup = (rawSiren, { enabled = true, debounceMs = 450 } = {}) => {
  const [state, setState] = useState('idle');
  const [company, setCompany] = useState(null);

  useEffect(() => {
    if (!enabled) {
      setState('idle');
      setCompany(null);
      return undefined;
    }

    const digits = sanitizeCompanyIdentifier(rawSiren);
    if (digits.length !== 9 && digits.length !== 14) {
      setState('idle');
      setCompany(null);
      return undefined;
    }

    let cancelled = false;
    setState('loading');
    const timer = window.setTimeout(() => {
      void lookupCompanyBySiren(digits)
        .then((payload) => {
          if (cancelled) return;
          const found = payload?.company || null;
          if (found?.denomination) {
            setCompany(found);
            setState('found');
          } else {
            setCompany(null);
            setState('notfound');
          }
        })
        .catch(() => {
          if (cancelled) return;
          setCompany(null);
          setState('notfound');
        });
    }, debounceMs);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [rawSiren, enabled, debounceMs]);

  return { state, company, digits: sanitizeCompanyIdentifier(rawSiren) };
};
