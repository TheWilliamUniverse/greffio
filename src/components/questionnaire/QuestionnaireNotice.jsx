import React from 'react';
import { AlertTriangle, FileText, Info, ShieldCheck, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

const VARIANTS = {
  info: {
    icon: Info,
    wrap: 'border-[#c5d9f5] bg-gradient-to-br from-[#f4f8ff] via-white to-[#fafcff]',
    iconWrap: 'bg-primary/10 text-primary',
    title: 'text-[hsl(var(--greffio-blue-900))]',
    body: 'text-muted-foreground',
  },
  tip: {
    icon: Sparkles,
    wrap: 'border-[#e8efd0] bg-gradient-to-br from-[#fbfdf4] via-white to-[#f8faf2]',
    iconWrap: 'bg-[hsl(var(--greffio-citron))]/25 text-[hsl(var(--greffio-blue-900))]',
    title: 'text-[hsl(var(--greffio-blue-900))]',
    body: 'text-[hsl(var(--greffio-blue-900))]/75',
  },
  vigilance: {
    icon: AlertTriangle,
    wrap: 'border-amber-200/80 bg-gradient-to-br from-amber-50/90 via-white to-[#fffdf8]',
    iconWrap: 'bg-amber-100 text-amber-800',
    title: 'text-amber-950',
    body: 'text-amber-900/85',
  },
  error: {
    icon: AlertTriangle,
    wrap: 'border-red-200/80 bg-gradient-to-br from-red-50/80 via-white to-white',
    iconWrap: 'bg-red-100 text-red-700',
    title: 'text-red-950',
    body: 'text-red-800/90',
  },
  document: {
    icon: FileText,
    wrap: 'border-[#d4e2f5] bg-white',
    iconWrap: 'bg-secondary text-primary',
    title: 'text-foreground',
    body: 'text-muted-foreground',
  },
  security: {
    icon: ShieldCheck,
    wrap: 'border-primary/20 bg-gradient-to-br from-secondary/80 via-white to-[#f8fbff]',
    iconWrap: 'bg-primary/12 text-primary',
    title: 'text-foreground',
    body: 'text-muted-foreground',
  },
};

export const QuestionnaireNotice = ({
  variant = 'info',
  title,
  children,
  items,
  className,
}) => {
  const config = VARIANTS[variant] || VARIANTS.info;
  const Icon = config.icon;

  return (
    <div
      className={cn(
        'overflow-hidden rounded-2xl border p-4 shadow-[0_8px_24px_rgba(15,31,61,0.05)] md:p-5',
        config.wrap,
        className,
      )}
      role={variant === 'error' || variant === 'vigilance' ? 'alert' : 'status'}
    >
      <div className="flex gap-3">
        <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', config.iconWrap)}>
          <Icon className="h-5 w-5" strokeWidth={2.25} aria-hidden />
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          {title ? (
            <p className={cn('text-sm font-bold leading-snug', config.title)}>{title}</p>
          ) : null}
          {items?.length ? (
            <ul className={cn('space-y-2 text-sm leading-6', config.body)}>
              {items.map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-50" aria-hidden />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          ) : null}
          {children ? (
            <div className={cn('text-sm leading-6', config.body)}>{children}</div>
          ) : null}
        </div>
      </div>
    </div>
  );
};
