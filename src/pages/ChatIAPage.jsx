import React from 'react';
import { Sidebar } from '@/components/Sidebar.jsx';
import IntegratedAiChat from '@/components/integrated-ai-chat.jsx';
import { useAuth } from '@/hooks/useAuth.js';
import { Info } from 'lucide-react';

export const ChatIAPage = () => {
  const { currentUser } = useAuth();

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-background overflow-hidden">
      <Sidebar />
      <main className="flex-1 flex flex-col h-full max-w-4xl mx-auto w-full p-4 md:p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Assistant Greffio</h1>
            <p className="text-sm text-muted-foreground">Guidage formalités et documents pour {currentUser?.company?.legalStructure || 'votre projet'}</p>
          </div>
          <div className="hidden md:flex items-center text-xs text-primary bg-primary/10 px-3 py-1.5 rounded-full">
            <Info className="h-4 w-4 mr-1" /> Assistant métier Greffio
          </div>
        </div>
        
        <div className="flex-1 bg-card border border-border rounded-md overflow-hidden shadow-sm flex flex-col">
          <IntegratedAiChat />
        </div>
      </main>
    </div>
  );
};
