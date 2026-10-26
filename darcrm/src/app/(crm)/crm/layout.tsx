import type { Metadata } from "next";
import { logoutAction } from "@/app/actions/auth";
import { listNotifications } from "@/application/crm/admin";
import { getDeps } from "@/infrastructure/container";
import { MobileNav } from "@/components/crm/mobile-nav";
import { NotificationBell } from "@/components/crm/notification-bell";
import { SidebarContent } from "@/components/crm/sidebar";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { loadOrRedirect, requireStaffPage } from "./_lib/guard";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: { default: "CRM · DarCRM", template: "%s · CRM DarCRM" } };

export default async function CrmLayout({ children }: { children: React.ReactNode }) {
  const session = await requireStaffPage();
  const deps = getDeps();
  const now = new Date();
  const [agency, agent, notifications] = await loadOrRedirect(() =>
    Promise.all([deps.agency.get(), deps.agents.findById(session.userId), listNotifications(deps, session, now)]),
  );

  const shell = { agencyName: agency.name, displayName: session.displayName, role: session.role, avatarUrl: agent?.avatarUrl ?? "" };

  return (
    <div className="min-h-screen bg-surface">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-outline-variant/40 lg:block">
        <SidebarContent {...shell} />
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-space-sm border-b border-outline-variant/40 bg-surface-container-lowest/90 px-space-md backdrop-blur lg:px-gutter-desktop">
          <MobileNav {...shell} />
          <p className="hidden font-label-md text-label-md text-on-surface-variant lg:block">Espace agence</p>
          <div className="ml-auto flex items-center gap-1">
            <NotificationBell notifications={notifications} now={now} />
            <form action={logoutAction}>
              <Button type="submit" variant="ghost" size="sm" aria-label="Se déconnecter">
                <Icon name="logout" className="text-[20px]" />
                <span className="hidden sm:inline">Déconnexion</span>
              </Button>
            </form>
          </div>
        </header>

        <main className="mx-auto max-w-[1280px] px-space-md py-space-lg lg:px-gutter-desktop">{children}</main>
      </div>
    </div>
  );
}
