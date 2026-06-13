import React from 'react';
import { Link } from 'react-router-dom';
import { PUBLISHER_LEGAL_NAME } from '@/config/publisher.js';

export const PublicMinimalLegalFooter = ({ className = '' }) => (
  <footer className={`border-t border-border bg-muted/20 px-4 py-6 sm:px-6 ${className}`.trim()}>
    <div className="mx-auto flex max-w-6xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs text-muted-foreground">{PUBLISHER_LEGAL_NAME}</p>
      <nav
        aria-label="Liens légaux"
        className="flex flex-wrap gap-x-4 gap-y-1 text-xs font-medium text-muted-foreground"
      >
        <Link to="/mentions-legales" className="hover:text-primary hover:underline">Mentions légales</Link>
        <Link to="/confidentialite" className="hover:text-primary hover:underline">Confidentialité</Link>
        <Link to="/cookies" className="hover:text-primary hover:underline">Cookies</Link>
        <Link to="/suppression-compte" className="hover:text-primary hover:underline">Suppression de compte</Link>
        <Link to="/contact" className="hover:text-primary hover:underline">Contact</Link>
      </nav>
    </div>
  </footer>
);
