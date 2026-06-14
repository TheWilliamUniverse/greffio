import React from 'react';
import { ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { cn } from '@/lib/utils.js';

export const ShopCartButton = ({ itemCount = 0, onClick, className }) => (
  <Button
    type="button"
    variant="outline"
    className={cn('relative bg-white', className)}
    onClick={onClick}
    aria-label={itemCount ? `Panier, ${itemCount} article${itemCount > 1 ? 's' : ''}` : 'Panier vide'}
  >
    <ShoppingCart className="h-4 w-4" />
    Panier
    {itemCount > 0 ? (
      <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[hsl(var(--greffio-blue))] px-1 text-[10px] font-bold text-white">
        {itemCount > 99 ? '99+' : itemCount}
      </span>
    ) : null}
  </Button>
);
