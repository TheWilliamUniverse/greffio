import React from 'react';
import { Link } from 'react-router-dom';
import { Bot, Search } from 'lucide-react';
import IntegratedAiChat from '@/components/integrated-ai-chat.jsx';
import { MobileAnimatedSection } from '@/mobile/ui/MobileAnimatedSection.jsx';
import { MobilePageContainer } from '@/mobile/ui/MobilePageContainer.jsx';
import { useAuth } from '@/hooks/useAuth.js';

export const MobileChatPage = () => {
  const { currentUser } = useAuth();

  return (
    <MobilePageContainer className="flex min-h-[50dvh] flex-col">
      <MobileAnimatedSection delay={0}>
        <p className="text-xs font-bold uppercase tracking-wide text-primary/80">Assistant Greffio</p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-[hsl(var(--greffio-blue-900))]">
          Guidage formalités
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Questions sur {currentUser?.company?.legalStructure || 'votre projet'}, vos documents ou la prochaine étape.
        </p>
        <Link
          to="/mobile/search"
          className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-primary"
        >
          <Search className="h-3.5 w-3.5" />
          Recherche rapide dossiers & documents
        </Link>
      </MobileAnimatedSection>

      <div className="mt-4 flex min-h-[420px] flex-1 flex-col overflow-hidden rounded-2xl border border-border bg-white shadow-elevation-sm">
        <div className="flex items-center gap-2 border-b border-border/70 px-4 py-3">
          <Bot className="h-4 w-4 text-primary" />
          <span className="text-sm font-bold">Conversation</span>
        </div>
        <div className="flex min-h-0 flex-1 flex-col">
          <IntegratedAiChat />
        </div>
      </div>
    </MobilePageContainer>
  );
};
