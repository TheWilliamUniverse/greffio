import React from 'react';
import { cn } from '@/lib/utils.js';

export const FieldError = ({ id, children, className }) => {
  if (!children) return null;
  return (
    <p id={id} role="alert" className={cn('text-sm text-destructive', className)}>
      {children}
    </p>
  );
};
