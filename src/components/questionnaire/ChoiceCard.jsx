import React from 'react';

export const ChoiceCard = ({
  selected,
  title,
  description,
  onClick,
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`rounded-md border p-4 text-left transition ${selected ? 'border-primary bg-secondary' : 'border-border bg-white hover:border-primary/40'}`}
  >
    <p className="font-bold">{title}</p>
    {description ? <p className="mt-1 text-xs text-muted-foreground">{description}</p> : null}
  </button>
);
