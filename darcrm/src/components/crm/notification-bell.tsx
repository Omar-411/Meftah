import Link from "next/link";
import type { CrmNotification } from "@/domain/account/account";
import { formatRelativeFr } from "@/domain/shared/format";
import { markNotificationsReadAction } from "@/app/actions/crm";
import { cn } from "@/lib/cn";
import { Icon } from "@/components/ui/icon";

const KIND_ICONS: Record<CrmNotification["kind"], string> = {
  new_lead: "person_add",
  reminder: "alarm",
  lead_assigned: "assignment_ind",
  alert_sent: "notifications_active",
};

/** A native <details> dropdown: works without client JS and needs no focus-trap code. */
export function NotificationBell({ notifications, now }: { notifications: readonly CrmNotification[]; now: Date }) {
  const unread = notifications.filter((notification) => !notification.read).length;

  return (
    <details className="group relative">
      <summary
        aria-label={unread > 0 ? `${unread} notifications non lues` : "Notifications"}
        className="relative flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container-low [&::-webkit-details-marker]:hidden"
      >
        <Icon name="notifications" className="text-[24px]" />
        {unread > 0 && (
          <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-error px-1 text-[10px] font-bold text-on-error">{unread}</span>
        )}
      </summary>

      <div className="absolute right-0 z-40 mt-2 w-[min(92vw,380px)] overflow-hidden rounded-xl bg-surface-container-lowest shadow-xl">
        <div className="flex items-center justify-between border-b border-outline-variant/40 px-space-md py-space-sm">
          <p className="font-headline-sm text-headline-sm text-on-surface">Notifications</p>
          {unread > 0 && (
            <form action={markNotificationsReadAction}>
              <button type="submit" className="font-label-md text-label-md text-primary hover:underline">Tout marquer comme lu</button>
            </form>
          )}
        </div>
        {notifications.length === 0 ? (
          <p className="px-space-md py-space-lg text-center font-body-md text-body-md text-on-surface-variant">Rien de nouveau pour le moment.</p>
        ) : (
          <ul className="max-h-96 divide-y divide-outline-variant/30 overflow-y-auto">
            {notifications.map((notification) => (
              <li key={notification.id}>
                <Link href={notification.href} className={cn("flex gap-space-sm px-space-md py-space-sm hover:bg-surface-container-low", !notification.read && "bg-primary-fixed/20")}>
                  <Icon name={KIND_ICONS[notification.kind]} className="mt-0.5 text-[20px] text-primary" />
                  <span className="min-w-0">
                    <span className="block font-label-md text-label-md font-semibold text-on-surface">{notification.title}</span>
                    <span className="block truncate font-body-sm text-body-sm text-on-surface-variant">{notification.body}</span>
                    <span className="block font-label-sm text-label-sm text-outline">{formatRelativeFr(new Date(notification.at), now)}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </details>
  );
}
