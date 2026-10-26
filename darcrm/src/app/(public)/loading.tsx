export default function PublicLoading() {
  return (
    <div className="mx-auto max-w-[1200px] px-space-md py-space-xl lg:px-gutter-desktop" aria-busy="true" aria-label="Chargement">
      <div className="h-10 w-1/3 animate-pulse rounded-lg bg-surface-container-high" />
      <div className="mt-space-lg grid gap-space-lg sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className="aspect-[4/3.4] animate-pulse rounded-xl bg-surface-container-high" />
        ))}
      </div>
    </div>
  );
}
