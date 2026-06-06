import React from 'react';

const toneMap = {
  default: 'text-slate-600',
  success: 'text-emerald-600',
  warning: 'text-amber-600',
  danger: 'text-rose-600',
  info: 'text-sky-600',
};

export const OpsKpiCard = ({
  title,
  value,
  hint,
  icon: Icon,
  tone = 'default',
  onClick,
  active = false,
}) => {
  const Wrapper = onClick ? 'button' : 'div';
  return (
    <Wrapper
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={`rounded-xl border bg-white p-5 text-left shadow-sm transition ${
        active ? 'border-slate-900 ring-2 ring-slate-900/10' : 'border-slate-200 hover:border-slate-300'
      } ${onClick ? 'cursor-pointer' : ''}`}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{title}</p>
        {Icon ? <Icon className={`h-5 w-5 shrink-0 ${toneMap[tone]}`} /> : null}
      </div>
      <p className="mt-3 text-3xl font-extrabold text-slate-900">{value}</p>
      {hint ? <p className="mt-2 text-xs text-slate-500">{hint}</p> : null}
    </Wrapper>
  );
};
