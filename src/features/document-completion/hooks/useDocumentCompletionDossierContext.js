import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getDossierById } from '@/api/dossiers.js';

export const useDocumentCompletionDossierContext = () => {
  const [searchParams] = useSearchParams();
  const dossierId = String(searchParams.get('dossierId') || '').trim();
  const [dossier, setDossier] = useState(null);
  const [loading, setLoading] = useState(Boolean(dossierId));
  const [error, setError] = useState('');

  useEffect(() => {
    if (!dossierId) {
      setDossier(null);
      setLoading(false);
      setError('');
      return undefined;
    }

    let mounted = true;
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const payload = await getDossierById(dossierId);
        if (!mounted) return;
        setDossier(payload?.dossier || payload || null);
      } catch (_err) {
        if (!mounted) return;
        setDossier(null);
        setError('Dossier introuvable ou accès refusé.');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void load();
    return () => { mounted = false; };
  }, [dossierId]);

  return { dossierId: dossierId || null, dossier, loading, error };
};
