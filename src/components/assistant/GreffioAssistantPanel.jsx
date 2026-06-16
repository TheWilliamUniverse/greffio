import React from 'react';
import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { useGreffioAssistant } from '@/components/assistant/useGreffioAssistant.js';

const quickPrompts = [
  'Où en est mon dossier ?',
  'Mon paiement est en vérification, c\'est normal ?',
  'Comment signer mon document ?',
  'Que dois-je faire maintenant ?',
];

export const GreffioAssistantPanel = () => {
  const {
    input,
    setInput,
    sending,
    messages,
    suggestedActions,
    sendMessage,
  } = useGreffioAssistant();

  const canSend = input.trim().length > 0;

  return (
    <div className="flex h-full flex-col bg-white">
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {messages.map((message, index) => (
          <div key={`${message.role}-${index}`} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[88%] rounded-md px-4 py-3 text-sm leading-6 ${message.role === 'user' ? 'bg-primary text-white' : 'bg-muted text-foreground'} ${message.pending ? 'animate-pulse opacity-80' : ''}`}>
              {message.pending ? 'Réponse en cours…' : message.content}
            </div>
          </div>
        ))}
      </div>

      {suggestedActions.length > 0 ? (
        <div className="border-t border-border px-4 py-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Actions suggérées</p>
          <div className="flex flex-wrap gap-2">
            {suggestedActions.map((action, index) => (
              action.url ? (
                <a
                  key={`${action.type}-${index}`}
                  href={action.url}
                  className="rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-semibold text-primary hover:bg-primary/10"
                >
                  {action.label}
                </a>
              ) : (
                <span
                  key={`${action.type}-${index}`}
                  className="rounded-full border border-border bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground"
                >
                  {action.label}
                </span>
              )
            ))}
          </div>
        </div>
      ) : null}

      <div className="border-t border-border p-4">
        <div className="mb-3 flex flex-wrap gap-2">
          {quickPrompts.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => sendMessage(prompt)}
              className="rounded-full border border-border bg-white px-3 py-1 text-xs font-semibold text-muted-foreground hover:bg-muted"
            >
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
          <Input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Posez votre question sur votre formalité…"
          />
          <Button type="submit" disabled={!canSend || sending} aria-label="Envoyer">
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
};
