export default function CrmLoading() {
  return (
    <div aria-busy="true" aria-label="Chargement" className="space-y-space-md">
      <div className="h-9 w-64 animate-pulse rounded-lg bg-surface-container-high" />
      <div className="grid grid-cols-2 gap-space-md lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="h-28 animate-pulse rounded-xl bg-surface-container-high" />
        ))}
      </div>
      <div className="h-64 animate-pulse rounded-xl bg-surface-container-high" />
    </div>
  );
}
