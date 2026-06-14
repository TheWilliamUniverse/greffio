import React from 'react';
import { ArrowRight, Clock, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { cn } from '@/lib/utils';
import {
  formatResourcePrice,
  getProcessingLabel,
  isResourceOrderable,
} from '@/config/resourceServices.js';

export const ResourceServiceCard = ({
  item,
  variant = 'default',
  onAction,
  shopMode = false,
  onQuickOrder,
  className,
}) => {
  const isPack = item.kind === 'pack';
  const isGuide = item.kind === 'guide';
  const isFree = !item.priceTtc || Number(item.priceTtc) <= 0;
  const orderable = isResourceOrderable(item);
  const showCart = shopMode && orderable && !isFree;

  return (
    <article
      className={cn(
        'group flex h-full flex-col rounded-xl border border-border bg-white p-5 shadow-elevation-sm transition duration-200',
        'hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-elevation-md',
        isPack && 'border-primary/20 bg-gradient-to-br from-white to-[hsl(var(--greffio-citron)/0.12)]',
        className,
      )}
    >
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {isPack && (
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
            <Sparkles className="h-3 w-3" />
            Pack Greffio
          </span>
        )}
        {isGuide && (
          <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
            Gratuit
          </span>
        )}
        {!isGuide && !isFree && (
          <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-foreground">
            {formatResourcePrice(item.priceTtc)}
          </span>
        )}
        {!item.available && (
          <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
            Bientôt
          </span>
        )}
      </div>

      <h3 className={cn('font-extrabold text-foreground', variant === 'compact' ? 'text-base' : 'text-lg')}>
        {item.title}
      </h3>
      <p className="mt-2 flex-1 text-sm leading-6 text-muted-foreground">{item.description}</p>

      <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
        <Clock className="h-3.5 w-3.5 shrink-0" />
        <span>{item.estimatedDelay || '–'}</span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{getProcessingLabel(item)}</p>

      {showCart ? (
        <div className="mt-5 space-y-2">
          <Button
            type="button"
            size="sm"
            className="w-full justify-between"
            onClick={() => onAction?.(item)}
          >
            Ajouter au panier
            <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => onQuickOrder?.(item)}
          >
            Commander maintenant
          </Button>
        </div>
      ) : (
        <Button
          type="button"
          variant={orderable || isGuide ? 'default' : 'outline'}
          size="sm"
          className="mt-5 w-full justify-between"
          onClick={() => onAction?.(item)}
        >
          {item.actionLabel || 'Découvrir'}
          <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
        </Button>
      )}
    </article>
  );
};
