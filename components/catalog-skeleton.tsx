type CatalogSkeletonProps = {
  count?: number;
};

export function CatalogSkeleton({ count = 12 }: CatalogSkeletonProps) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          className="overflow-hidden rounded-lg border border-zinc-800/60 bg-zinc-900/40"
        >
          <div className="aspect-[4/3] animate-pulse bg-zinc-800/50" />
          <div className="h-6 animate-pulse bg-zinc-900/80" />
        </div>
      ))}
    </div>
  );
}
