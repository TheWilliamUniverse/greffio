import React from 'react';

export const ProfileSection = ({
  icon: Icon,
  title,
  description,
  children,
  id,
}) => (
  <section id={id} className="we-panel overflow-hidden">
    <div className="border-b border-[var(--we-border)] px-5 py-4 md:px-6">
      <div className="flex items-start gap-3">
        {Icon ? (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#eef3fb]">
            <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
          </div>
        ) : null}
        <div>
          <h2 className="text-lg font-extrabold text-foreground md:text-xl">{title}</h2>
          {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
        </div>
      </div>
    </div>
    <div className="space-y-5 p-5 md:p-6">{children}</div>
  </section>
);
