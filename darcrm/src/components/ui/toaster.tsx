"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import { cn } from "@/lib/cn";
import { toast, toastStore, type ToastItem, type ToastKind } from "@/lib/toast";
import { Icon } from "./icon";

export const FLASH_COOKIE = "darcrm_flash";

const STYLE: Record<ToastKind, { icon: string; bar: string; iconClass: string }> = {
  success: { icon: "check_circle", bar: "bg-secondary", iconClass: "text-secondary" },
  error: { icon: "error", bar: "bg-error", iconClass: "text-error" },
  info: { icon: "info", bar: "bg-primary-container", iconClass: "text-primary-container" },
};

function ToastCard({ item }: { item: ToastItem }) {
  const [paused, setPaused] = useState(false);
  const style = STYLE[item.kind];

  useEffect(() => {
    if (paused) return;
    const timer = setTimeout(() => toast.dismiss(item.id), item.durationMs);
    return () => clearTimeout(timer);
  }, [paused, item.id, item.durationMs]);

  return (
    <li
      role={item.kind === "error" ? "alert" : "status"}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      className="toast-in pointer-events-auto relative overflow-hidden rounded-xl bg-surface-container-lowest shadow-lg ring-1 ring-outline-variant/40"
    >
      <div className="flex items-start gap-space-sm py-space-sm pl-space-md pr-space-xs">
        <Icon name={style.icon} className={cn("mt-0.5 text-[22px] [font-variation-settings:'FILL'_1]", style.iconClass)} />
        <div className="min-w-0 flex-1 py-0.5">
          <p className="font-label-md text-label-md font-semibold text-on-surface">{item.title}</p>
          {item.details.length > 0 && (
            <ul className="mt-1 space-y-0.5">
              {item.details.map((detail) => (
                <li key={detail} className="font-body-sm text-body-sm text-on-surface-variant">
                  {detail}
                </li>
              ))}
            </ul>
          )}
        </div>
        <button
          type="button"
          onClick={() => toast.dismiss(item.id)}
          aria-label="Fermer la notification"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-outline transition-colors hover:bg-surface-container-high hover:text-on-surface"
        >
          <Icon name="close" className="text-[18px]" />
        </button>
      </div>
      <span
        aria-hidden="true"
        className={cn("toast-progress absolute inset-x-0 bottom-0 h-0.5 origin-left", style.bar)}
        style={{ animationDuration: `${item.durationMs}ms`, animationPlayState: paused ? "paused" : "running" }}
      />
    </li>
  );
}

/** Server actions that redirect cannot return a message, so they leave a short-lived cookie that is shown once on the next page. */
function useFlashCookie() {
  const pathname = usePathname();
  useEffect(() => {
    const entry = document.cookie.split("; ").find((cookie) => cookie.startsWith(`${FLASH_COOKIE}=`));
    if (!entry) return;
    document.cookie = `${FLASH_COOKIE}=; path=/; max-age=0`;
    try {
      const flash = JSON.parse(decodeURIComponent(entry.slice(FLASH_COOKIE.length + 1))) as { kind?: ToastKind; message?: string };
      if (flash.message) toast[flash.kind === "error" ? "error" : flash.kind === "info" ? "info" : "success"](flash.message);
    } catch {
      // A malformed flash is simply ignored.
    }
  }, [pathname]);
}

export function Toaster() {
  const items = useSyncExternalStore(toastStore.subscribe, toastStore.getSnapshot, toastStore.getServerSnapshot);
  useFlashCookie();

  return (
    <ol
      aria-label="Notifications"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[100] mx-auto flex w-full max-w-[420px] flex-col gap-space-sm p-space-md sm:inset-x-auto sm:right-0"
    >
      {items.map((item) => (
        <ToastCard key={item.id} item={item} />
      ))}
    </ol>
  );
}
