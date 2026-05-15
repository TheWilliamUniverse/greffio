import React, { useMemo, useState } from 'react';
import { Bot, Send, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';

const quickPrompts = [
  'Quels documents manquent pour une SASU ',
  'Explique la différence SAS et SARL',
  'Prépare une relance client polie',
  'Quels frais légaux prévoir ',
];

const answerFor = (message) => {
  const text = message.toLowerCase();

  if (text.includes('document') || text.includes('pièce') || text.includes('manquent')) {
    return 'Pour une création SAS/SASU, vérifiez surtout : statuts signés, attestation de dépôt de capital, justificatif de siège, pièce d’identité du dirigeant, déclaration de non-condamnation, bénéficiaires effectifs et annonce légale.';
  }

  if (text.includes('sas') && text.includes('sarl')) {
    return 'La SAS offre plus de liberté statutaire et une présidence affiliée au régime assimilé salarié. La SARL est plus encadrée, souvent choisie pour un projet familial ou une gouvernance stable.';
  }

  if (text.includes('relance')) {
    return 'Bonjour, nous avons besoin de la pièce demandée pour finaliser votre dossier et éviter un blocage au greffe. Vous pouvez l’ajouter depuis votre espace Greffio. Merci beaucoup.';
  }

  if (text.includes('frais') || text.includes('coût')) {
    return 'Les frais à prévoir dépendent de la forme et du département : annonce légale, frais de guichet/greffe, bénéficiaires effectifs et éventuellement dépôt de capital. Greffio les rattache au dossier pour les rendre lisibles.';
  }

  return 'Je peux vous aider à préparer une formalité, résumer un dossier, vérifier une checklist ou rédiger une relance client. Donnez-moi la forme juridique, la démarche et l’action à traiter.';
};

export default function IntegratedAiChat() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Bonjour, je suis l’assistant interne Greffio. Je peux aider sur les statuts, pièces, relances et démarches greffe.' },
  ]);

  const canSend = useMemo(() => input.trim().length > 0, [input]);

  const sendMessage = (message = input) => {
    const clean = message.trim();
    if (!clean) return;

    setMessages((current) => [
      ...current,
      { role: 'user', content: clean },
      { role: 'assistant', content: answerFor(clean) },
    ]);
    setInput('');
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
            <p className="text-xs text-muted-foreground">Réponses internes sans backend externe</p>
          </div>
        </div>
        <Sparkles className="h-5 w-5 text-primary" />
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {messages.map((message, index) => (
          <div key={`${message.role}-${index}`} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[82%] rounded-md px-4 py-3 text-sm leading-6 ${message.role === 'user' ? 'bg-primary text-white' : 'bg-muted text-foreground'}`}>
              {message.content}
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
          <Button type="submit" disabled={!canSend}>
            <Send className="h-4 w-4" />
            Envoyer
          </Button>
        </form>
      </div>
    </div>
  );
}
