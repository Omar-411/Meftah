"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { StaffRole } from "@/domain/auth/session";
import { ROLE_LABELS } from "@/domain/auth/session";
import { LOGO } from "@/infrastructure/mock-assets";
import { cn } from "@/lib/cn";
import { Avatar } from "@/components/ui/avatar";
import { Icon } from "@/components/ui/icon";

interface NavItem {
  href: string;
  label: string;
  icon: string;
  adminOnly?: boolean;
}

const NAV: readonly NavItem[] = [
  { href: "/crm/aujourdhui", label: "Aujourd'hui", icon: "today" },
  { href: "/crm", label: "Tableau de bord", icon: "dashboard" },
  { href: "/crm/biens", label: "Biens", icon: "home_work" },
  { href: "/crm/prospects", label: "Prospects", icon: "groups" },
  { href: "/crm/rendez-vous", label: "Rendez-vous", icon: "calendar_month" },
  { href: "/crm/rapprochement", label: "Rapprochement", icon: "join_inner" },
  { href: "/crm/agents", label: "Agents", icon: "badge", adminOnly: true },
  { href: "/crm/utilisateurs", label: "Utilisateurs", icon: "manage_accounts", adminOnly: true },
  { href: "/crm/parametres", label: "Paramètres", icon: "settings", adminOnly: true },
];

interface SidebarProps {
  agencyName: string;
  displayName: string;
  role: StaffRole;
  avatarUrl: string;
  /** Rendered inside the mobile drawer to close it after navigating. */
  onNavigate?: () => void;
}

export function SidebarContent({ agencyName, displayName, role, avatarUrl, onNavigate }: SidebarProps) {
  const pathname = usePathname();
  const items = NAV.filter((item) => !item.adminOnly || role === "admin");
  const isActive = (href: string) => (href === "/crm" ? pathname === "/crm" : pathname.startsWith(href));

  return (
    <div className="flex h-full flex-col bg-surface-container-lowest">
      <Link href="/crm" onClick={onNavigate} className="flex items-center gap-2.5 px-space-lg py-space-lg">
        <Image src={LOGO} alt="" width={32} height={32} className="h-8 w-8 rounded-lg" />
        <span className="font-display text-[17px] font-semibold tracking-tight text-primary">{agencyName}</span>
      </Link>

      <nav aria-label="Navigation CRM" className="flex-1 space-y-1 px-space-sm">
        {items.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-space-sm rounded-lg px-space-md py-2.5 font-label-md text-label-md transition-colors",
                active ? "bg-primary-container text-on-primary" : "text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface",
              )}
            >
              <Icon name={item.icon} className="text-[22px]" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-outline-variant/40 p-space-md">
        <Link href="/" onClick={onNavigate} className="mb-space-sm flex items-center gap-space-sm rounded-lg px-space-sm py-2 font-label-md text-label-md text-on-surface-variant hover:bg-surface-container-low">
          <Icon name="open_in_new" className="text-[20px]" />
          Voir le site public
        </Link>
        <Link href="/crm/profil" onClick={onNavigate} aria-label="Mon profil" className="flex items-center gap-space-sm rounded-lg px-space-sm py-1.5 transition-colors hover:bg-surface-container-low">
          <Avatar name={displayName} url={avatarUrl || undefined} size={36} />
          <div className="min-w-0 flex-1">
            <p className="truncate font-label-md text-label-md font-semibold text-on-surface">{displayName}</p>
            <p className="font-label-sm text-label-sm text-on-surface-variant">{ROLE_LABELS[role]}</p>
          </div>
          <Icon name="chevron_right" className="text-[20px] text-outline" />
        </Link>
      </div>
    </div>
  );
}
