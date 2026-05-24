import React from 'react';
import { ResourceServiceCard } from '@/components/resources/ResourceServiceCard.jsx';

export const ResourceSectionGrid = ({
  id,
  title,
  subtitle,
  items,
  onAction,
  columns = 'md:grid-cols-2 xl:grid-cols-3',
}) => (
  <section id={id} className="mt-14 scroll-mt-24">
    <div className="mb-6 max-w-2xl">
      <h2 className="text-2xl font-extrabold tracking-tight text-foreground">{title}</h2>
      {subtitle && (
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{subtitle}</p>
      )}
    </div>
    <div className={`grid gap-4 ${columns}`}>
      {items.map((item) => (
        <ResourceServiceCard key={item.id} item={item} onAction={onAction} />
      ))}
    </div>
  </section>
);
