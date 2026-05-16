import { useCallback, useState } from 'react';

const answerFor = (message) => {
  const text = message.toLowerCase();

  if (text.includes('statut') || text.includes('sas')) {
    return 'Je peux préparer une trame de statuts, la checklist greffe et les prochaines pièces à collecter selon la forme juridique.';
  }

  if (text.includes('relance') || text.includes('email')) {
    return 'Voici une relance possible : “Bonjour, il manque encore une pièce pour finaliser votre dossier. Vous pouvez l’ajouter depuis votre espace Greffio afin que nous poursuivions l’envoi au greffe.”';
  }

  return 'Je peux vous aider à résumer un dossier, préparer une formalité, vérifier une checklist ou rédiger un message client.';
};

export function useIntegratedAi() {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Assistant Greffio propulsé par ChatGPT, prêt à répondre sur vos formalités.' },
  ]);
  const [isStreaming] = useState(false);
  const [isLoadingHistory] = useState(false);

  const sendMessage = useCallback((userMessage) => {
    setMessages((current) => [
      ...current,
      { role: 'user', content: userMessage },
      { role: 'assistant', content: answerFor(userMessage) },
    ]);
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  return {
    messages,
    isStreaming,
    isLoadingHistory,
    sendMessage,
    clearMessages,
  };
}

export default useIntegratedAi;
