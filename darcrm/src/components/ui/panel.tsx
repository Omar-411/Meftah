import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Icon } from "./icon";

interface PanelProps {
  icon: string;
  iconClassName?: string;
  title: string;
  trailing?: ReactNode;
  children: ReactNode;
}

/** Dashboard card with an icon + headline-md title row. */
export function Panel({ icon, iconClassName, title, trailing, children }: PanelProps) {
  return (
    <section className="rounded-xl bg-surface-container-lowest p-space-lg shadow-sm">
      <div className="mb-space-sm flex items-center justify-between gap-space-sm pb-space-sm">
        <div className="flex items-center gap-2">
          <Icon name={icon} className={cn("text-[22px]", iconClassName ?? "text-primary")} />
          <h2 className="font-headline-md text-headline-md text-on-surface">{title}</h2>
        </div>
        {trailing}
      </div>
      {children}
    </section>
  );
}
