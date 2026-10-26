"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/icon";
import { SidebarContent } from "./sidebar";
import type { ComponentProps } from "react";

/** Below lg the sidebar becomes a drawer opened from the top bar. */
export function MobileNav(props: Omit<ComponentProps<typeof SidebarContent>, "onNavigate">) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        aria-label="Ouvrir le menu"
        onClick={() => setOpen(true)}
        className="flex h-10 w-10 items-center justify-center rounded-lg text-on-surface hover:bg-surface-container-low lg:hidden"
      >
        <Icon name="menu" className="text-[24px]" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <button type="button" aria-label="Fermer le menu" className="absolute inset-0 bg-on-surface/40" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-72 shadow-xl">
            <SidebarContent {...props} onNavigate={() => setOpen(false)} />
          </div>
        </div>
      )}
    </>
  );
}
