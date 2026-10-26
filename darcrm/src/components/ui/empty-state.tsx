import type { ReactNode } from "react";
import { Icon } from "./icon";

interface EmptyStateProps {
  icon: string;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-space-sm rounded-xl bg-surface-container-lowest px-space-lg py-space-xl text-center shadow-sm">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-container-low text-primary">
        <Icon name={icon} className="text-[26px]" />
      </span>
      <h3 className="font-headline-sm text-headline-sm text-on-surface">{title}</h3>
      {description && <p className="max-w-md font-body-md text-body-md text-on-surface-variant">{description}</p>}
      {action && <div className="mt-space-sm">{action}</div>}
    </div>
  );
}
