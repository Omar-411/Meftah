import type { ReactNode } from "react";

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-space-lg flex flex-wrap items-start justify-between gap-space-md">
      <div>
        <h1 className="font-display text-[26px] font-semibold leading-tight text-on-surface">{title}</h1>
        {subtitle && <p className="mt-1 font-body-md text-body-md text-on-surface-variant">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-space-sm">{actions}</div>}
    </div>
  );
}
