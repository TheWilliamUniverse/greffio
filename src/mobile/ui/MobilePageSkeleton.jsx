export const MobilePageSkeleton = () => (
  <div className="animate-pulse space-y-4 px-4 py-5">
    <div className="h-4 w-32 rounded bg-muted" />
    <div className="h-8 w-3/4 rounded bg-muted" />
    <div className="h-24 rounded-2xl bg-muted/80" />
    <div className="grid grid-cols-2 gap-3">
      <div className="h-28 rounded-2xl bg-muted/70" />
      <div className="h-28 rounded-2xl bg-muted/70" />
    </div>
    <div className="h-40 rounded-2xl bg-muted/60" />
  </div>
);
