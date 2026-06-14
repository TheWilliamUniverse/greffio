import React from 'react';
import { ResourceServiceCard } from '@/components/resources/ResourceServiceCard.jsx';

export const ResourceSectionGrid = ({
  id,
  title,
  subtitle,
  items,
  onAction,
  onQuickOrder,
  shopMode = false,
  columns = 'md:grid-cols-2 xl:grid-cols-3',
  highlight = false,
}) => (
  <section
    id={id}
    className={highlight
      ? 'mt-10 scroll-mt-24 rounded-2xl border border-emerald-200/70 bg-gradient-to-br from-emerald-50/50 via-white to-white p-6 md:p-8'
      : 'mt-14 scroll-mt-24'}
  >
    <div className="mb-6 max-w-2xl">
      <h2 className="text-2xl font-extrabold tracking-tight text-foreground">{title}</h2>
      {subtitle && (
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{subtitle}</p>
      )}
    </div>
    <div className={`grid gap-4 ${columns}`}>
      {items.map((item) => (
        <ResourceServiceCard
          key={item.id}
          item={item}
          onAction={onAction}
          shopMode={shopMode}
          onQuickOrder={onQuickOrder}
        />
      ))}
    </div>
  </section>
);
