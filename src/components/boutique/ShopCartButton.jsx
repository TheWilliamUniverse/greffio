import React from 'react';
import { ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { cn } from '@/lib/utils.js';
import { CountBadge, countBadgeHostClass } from '@/components/ui/count-badge.jsx';

export const ShopCartButton = ({ itemCount = 0, onClick, className }) => (
  <Button
    type="button"
    variant="outline"
    className={cn(countBadgeHostClass, 'bg-white', className)}
    onClick={onClick}
    aria-label={itemCount ? `Panier, ${itemCount} article${itemCount > 1 ? 's' : ''}` : 'Panier vide'}
  >
    <ShoppingCart className="h-4 w-4" />
    Panier
    <CountBadge
      count={itemCount}
      max={99}
      className="bg-[hsl(var(--greffio-blue))]"
    />
  </Button>
);
