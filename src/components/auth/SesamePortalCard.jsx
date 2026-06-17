import React from 'react';
import { Lock, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils.js';

export const SESAME_PAGE_CLASS = 'relative min-h-[100dvh] overflow-hidden bg-[#021428] text-white';

export const SesamePortalCard = ({
  title,
  subtitle,
  description,
  icon: Icon,
  onClick,
  locked = false,
  disabled = false,
  className,
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled || locked}
    className={cn(
      'group relative flex w-full flex-col items-start rounded-[28px] border border-white/10 bg-white/[0.06] p-6 text-left shadow-[0_24px_80px_rgba(0,0,0,0.35)] backdrop-blur-md transition duration-300',
      locked ? 'cursor-not-allowed opacity-55' : 'hover:-translate-y-1 hover:border-white/20 hover:bg-white/[0.1]',
      className,
    )}
  >
    <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 text-white ring-1 ring-white/10">
      {locked ? <Lock className="h-6 w-6" /> : <Icon className="h-6 w-6" />}
    </div>
    <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/60">{subtitle}</p>
    <h3 className="mt-2 text-2xl font-extrabold tracking-tight">{title}</h3>
    <p className="mt-3 text-sm leading-6 text-white/75">{description}</p>
    {!locked ? (
      <span className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-white/90">
        <Sparkles className="h-4 w-4" />
        Entrer
      </span>
    ) : (
      <span className="mt-6 text-sm font-semibold text-white/50">Accès réservé Admin / Ops</span>
    )}
  </button>
);
