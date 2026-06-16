import React, { useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Bot, Send, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { askAssistant } from '@/api/assistant.js';
import { resolveActiveDossierId } from '@/utils/resolveActiveDossierId.js';

const quickPrompts = [
  'Où en est mon dossier ?',
  'Quels documents manquent pour une SASU',
  'Explique la différence SAS et SARL',
  'Quels frais légaux prévoir',
];

export default function IntegratedAiChat() {
  const location = useLocation();
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Bonjour, je suis l’assistant Greffio. Je vous guide sur vos formalités, documents, signatures et prochaines étapes – de façon claire et actionnable.' },
  ]);

  const dossierId = useMemo(() => resolveActiveDossierId({
    pathname: location.pathname,
    search: location.search,
  }), [location.pathname, location.search]);

  const canSend = useMemo(() => input.trim().length > 0, [input]);

  const sendMessage = async (message = input) => {
    const clean = message.trim();
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
    } catch (_error) {
      setMessages((current) => [
        ...current.filter((item) => !item.pending),
        { role: 'assistant', content: 'Je n’ai pas pu joindre l’assistant pour le moment. Réessayez dans quelques secondes ou contactez l’équipe Greffio.' },
      ]);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex h-full flex-col bg-white">
      <div className="flex items-center justify-between border-b border-border p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-secondary text-primary">
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-extrabold">Assistant Greffio</h2>
            <p className="text-xs text-muted-foreground">Formalités, documents et prochaines étapes</p>
          </div>
        </div>
        <Sparkles className="h-5 w-5 text-primary" />
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {messages.map((message, index) => (
          <div key={`${message.role}-${index}`} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[82%] rounded-md px-4 py-3 text-sm leading-6 ${message.role === 'user' ? 'bg-primary text-white' : 'bg-muted text-foreground'} ${message.pending ? 'animate-pulse opacity-80' : ''}`}>
              {message.pending ? 'Réponse en cours…' : message.content}
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-border p-4">
        <div className="mb-3 flex flex-wrap gap-2">
          {quickPrompts.map((prompt) => (
            <button key={prompt} type="button" onClick={() => sendMessage(prompt)} className="rounded-full border border-border bg-white px-3 py-1 text-xs font-semibold text-muted-foreground hover:bg-muted">
              {prompt}
            </button>
          ))}
        </div>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            sendMessage();
          }}
          className="flex gap-3"
        >
          <Input value={input} onChange={(event) => setInput(event.target.value)} placeholder="Demander une analyse, une relance, une checklist..." />
          <Button type="submit" disabled={!canSend || sending}>
            <Send className="h-4 w-4" />
            {sending ? 'Envoi...' : 'Envoyer'}
          </Button>
        </form>
      </div>
    </div>
  );
}
