import React, { useEffect, useRef, useState } from 'react';
import { Mail, Send } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Textarea } from '@/components/ui/textarea.jsx';
import { toast } from 'sonner';

const formatTime = (value) => {
  if (!value) return '';
  return new Date(value).toLocaleString('fr-FR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const DossierMessageThread = ({
  messages = [],
  loading = false,
  onSend,
  onSendEmail,
  viewerRole = 'client',
  clientEmail = '',
  emptyHint = 'Aucun message pour le moment. Écrivez ici pour contacter l’équipe Greffio.',
}) => {
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [emailSubject, setEmailSubject] = useState('Message de l’équipe Greffio');
  const [emailTo, setEmailTo] = useState(clientEmail || '');
  const scrollRef = useRef(null);

  useEffect(() => {
    setEmailTo(clientEmail || '');
  }, [clientEmail]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length, messages[messages.length - 1]?.id, messages[messages.length - 1]?.updatedAt]);

  const submitMessage = async () => {
    const body = draft.trim();
    if (!body || !onSend) return;
    setSending(true);
    try {
      await onSend(body);
      setDraft('');
      toast.success('Message envoyé');
    } catch (error) {
      toast.error(error?.message || 'Envoi impossible');
    } finally {
      setSending(false);
    }
  };

  const submitEmail = async () => {
    const body = draft.trim();
    if (!body || !onSendEmail) return;
    if (!emailTo.trim()) {
      toast.error('Indiquez l’email du destinataire.');
      return;
    }
    setSending(true);
    try {
      await onSendEmail({ body, toEmail: emailTo.trim(), subject: emailSubject.trim() });
      setDraft('');
      toast.success('Message envoyé par email');
    } catch (error) {
      toast.error(error?.message || 'Envoi email impossible');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="rounded-md border border-border bg-white shadow-elevation-sm">
      <div
        ref={scrollRef}
        className="max-h-[420px] space-y-3 overflow-y-auto p-5"
      >
        {loading ? (
          <p className="text-sm text-muted-foreground">Chargement des messages…</p>
        ) : messages.length ? messages.map((item) => {
          const fromClient = item.authorType === 'client';
          const fromOps = item.authorType === 'ops';
          const opsDirectionLabel = viewerRole === 'ops'
            ? (fromOps ? 'Message envoyé' : 'Message reçu')
            : null;
          return (
            <div
              key={item.id}
              className={`max-w-[88%] rounded-md p-4 text-sm leading-6 ${
                fromClient
                  ? 'ml-auto bg-[hsl(var(--greffio-blue))] text-white'
                  : 'bg-muted text-foreground'
              }`}
            >
              <div className="mb-1 flex flex-wrap items-center justify-between gap-2 text-xs font-bold opacity-80">
                <span>
                  {opsDirectionLabel
                    || item.authorName
                    || (fromOps ? 'Équipe Greffio' : 'Vous')}
                </span>
                <span>{formatTime(item.createdAt)}</span>
              </div>
              <p>{item.body}</p>
              {item.channel === 'email' ? (
                <p className={`mt-2 text-xs ${fromClient ? 'text-white/70' : 'text-muted-foreground'}`}>
                  {item.emailSentAt ? 'Envoyé par email' : 'Email en cours'}
                </p>
              ) : null}
            </div>
          );
        }) : (
          <div className="rounded-md bg-muted p-4 text-sm text-muted-foreground">{emptyHint}</div>
        )}
      </div>

      <div className="space-y-3 border-t border-border p-5">
        <Textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Votre message…"
          rows={3}
          className="resize-none"
        />
        <div className="flex flex-wrap gap-2">
          <Button type="button" disabled={sending || !draft.trim()} onClick={() => void submitMessage()}>
            <Send className="h-4 w-4" />
            Publier dans le fil
          </Button>
          {viewerRole === 'ops' && onSendEmail ? (
            <>
              <Input
                value={emailTo}
                onChange={(event) => setEmailTo(event.target.value)}
                placeholder="Email client"
                type="email"
                className="max-w-xs"
              />
              <Input
                value={emailSubject}
                onChange={(event) => setEmailSubject(event.target.value)}
                placeholder="Objet"
                className="max-w-xs"
              />
              <Button type="button" variant="outline" disabled={sending || !draft.trim()} onClick={() => void submitEmail()}>
                <Mail className="h-4 w-4" />
                Envoyer par email
              </Button>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
};
