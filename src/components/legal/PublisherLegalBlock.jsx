import React from 'react';
import { Link } from 'react-router-dom';
import {
  PUBLISHER_ADDRESS_FULL,
  PUBLISHER_BRAND,
  PUBLISHER_CONTACT_EMAIL,
  PUBLISHER_LEGAL_NAME,
  PUBLISHER_PHONE,
  PUBLISHER_RCS,
  PUBLISHER_RCS_NUMBER,
  PUBLISHER_SERVICE_DISCLAIMER,
  PUBLISHER_SIRET,
  PUBLISHER_VAT,
  PUBLISHER_WEBSITE,
} from '@/config/publisher.js';
import { cn } from '@/lib/utils.js';

export const PublisherLegalBlock = ({
  variant = 'full',
  showDisclaimer = true,
  showLinks = false,
  className,
}) => {
  const compact = variant === 'compact';

  return (
    <div
      className={cn(
        compact ? 'space-y-2 text-sm leading-6 text-muted-foreground' : 'space-y-3 text-sm leading-7 text-muted-foreground',
        className,
      )}
    >
      <p>
        <strong className="text-foreground">{PUBLISHER_LEGAL_NAME}</strong>
      </p>
      <p>
        Siège social : <span className="text-foreground">{PUBLISHER_ADDRESS_FULL}</span>
      </p>
      <p>
        Immatriculée au RCS de Nice sous le numéro {PUBLISHER_RCS_NUMBER}
        {!compact ? ` (${PUBLISHER_RCS})` : ''}.
      </p>
      <p>
        SIRET : {PUBLISHER_SIRET}
        {!compact ? ` · TVA intracommunautaire : ${PUBLISHER_VAT}` : ''}
      </p>
      {compact ? (
        <p>TVA intracommunautaire : {PUBLISHER_VAT}</p>
      ) : null}
      <p>
        {PUBLISHER_BRAND} est une marque déposée et un service édité par {PUBLISHER_LEGAL_NAME}.
      </p>
      {showDisclaimer ? (
        <p>{PUBLISHER_SERVICE_DISCLAIMER}</p>
      ) : null}
      <p>
        Contact :{' '}
        <a href={`mailto:${PUBLISHER_CONTACT_EMAIL}`} className="font-semibold text-primary hover:underline">
          {PUBLISHER_CONTACT_EMAIL}
        </a>
        {' · '}
        <a href={`tel:${PUBLISHER_PHONE.replace(/\s+/g, '')}`} className="font-semibold text-primary hover:underline">
          {PUBLISHER_PHONE}
        </a>
      </p>
      {!compact ? (
        <p>
          Site web :{' '}
          <a href={PUBLISHER_WEBSITE} className="font-semibold text-primary hover:underline">
            {PUBLISHER_WEBSITE}
          </a>
        </p>
      ) : null}
      {showLinks ? (
        <p className="flex flex-wrap gap-x-3 gap-y-1 pt-1">
          <Link to="/mentions-legales" className="font-semibold text-primary hover:underline">Mentions légales</Link>
          <Link to="/confidentialite" className="font-semibold text-primary hover:underline">Confidentialité</Link>
          <Link to="/contact" className="font-semibold text-primary hover:underline">Contact</Link>
        </p>
      ) : null}
    </div>
  );
};
