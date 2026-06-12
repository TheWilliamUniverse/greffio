import React from 'react';

export const BrandName = ({ as: Component = 'span', className = '' }) => (
  <Component className={`notranslate ${className}`.trim()} translate="no" lang="fr">
    Greffio
  </Component>
);
