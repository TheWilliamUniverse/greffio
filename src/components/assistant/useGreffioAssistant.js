import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { askAssistant } from '@/api/assistant.js';
import { resolveActiveDossierId } from '@/utils/resolveActiveDossierId.js';

const INITIAL_MESSAGE = {
  role: 'assistant',
  content: 'Bonjour, je suis l’assistant Greffio. Je vous guide sur vos formalités, documents, signatures et prochaines étapes – de façon claire et actionnable.',
};

export const useGreffioAssistant = () => {
  const location = useLocation();
  const params = useParams();
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState([INITIAL_MESSAGE]);
  const [suggestedActions, setSuggestedActions] = useState([]);

  const dossierId = useMemo(() => resolveActiveDossierId({
    params,
    pathname: location.pathname,
    search: location.search,
  }), [location.pathname, location.search, params]);

  useEffect(() => {
    if (dossierId) {
      resolveActiveDossierId({
        params,
        pathname: location.pathname,
        search: location.search,
        persist: true,
      });
    }
  }, [dossierId, location.pathname, location.search, params]);

  const sendMessage = useCallback(async (message = input) => {
    const clean = String(message || '').trim();
    if (!clean || sending) return;

    const nextMessages = [
      ...messages,
      { role: 'user', content: clean },
    ];
    setMessages((current) => [
      ...current,
      { role: 'user', content: clean },
    ]);
    setInput('');
    setSending(true);
    setSuggestedActions([]);
    setMessages((current) => [
      ...current,
      { role: 'assistant', content: '…', pending: true },
    ]);

    try {
      const payload = await askAssistant({
        message: clean,
        history: nextMessages.slice(-8),
        dossierId,
        route: location.pathname,
      });
      setMessages((current) => [
        ...current.filter((item) => !item.pending),
        {
          role: 'assistant',
          content: payload?.answer || 'Je n’ai pas pu générer de réponse pour le moment. Réessayez ou contactez l’équipe Greffio.',
        },
      ]);
      setSuggestedActions(
        Array.isArray(payload?.suggestedActions)
          ? payload.suggestedActions.filter((action, index, list) => {
            const label = String(action?.label || '').trim().toLowerCase();
            if (!label) return false;
            if (label.includes('backend') || label.includes('/api/') || label.includes('afficher le bouton')) {
              return false;
            }
            return list.findIndex((item) => String(item?.label || '').trim().toLowerCase() === label) === index;
          })
          : [],
      );
    } catch (_error) {
      setMessages((current) => [
        ...current.filter((item) => !item.pending),
        { role: 'assistant', content: 'Je n’ai pas pu joindre l’assistant pour le moment. Réessayez dans quelques secondes ou contactez l’équipe Greffio.' },
      ]);
    } finally {
      setSending(false);
    }
  }, [dossierId, input, location.pathname, messages, sending]);

  return {
    input,
    setInput,
    sending,
    messages,
    suggestedActions,
    sendMessage,
    dossierId,
  };
};
