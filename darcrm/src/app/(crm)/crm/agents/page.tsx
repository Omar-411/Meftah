import type { Metadata } from "next";
import Link from "next/link";
import { listAgentPerformance } from "@/application/crm/admin";
import { formatAmount, pluralize } from "@/domain/shared/format";
import { getDeps } from "@/infrastructure/container";
import { PageHeader } from "@/components/crm/page-header";
import { Avatar } from "@/components/ui/avatar";
import { Icon } from "@/components/ui/icon";
import { loadOrRedirect, requireAdminPage } from "../_lib/guard";

export const metadata: Metadata = { title: "Agents" };

export default async function AgentsPage() {
  const session = await requireAdminPage();
  const rows = await loadOrRedirect(() => listAgentPerformance(getDeps(), session, new Date()));

  return (
    <>
      <PageHeader title="Agents" subtitle="Activité et commissions de l'équipe." />
      <div className="grid gap-space-md md:grid-cols-2 xl:grid-cols-3">
        {rows.map((row) => (
          <Link key={row.agent.id} href={`/crm/agents/${row.agent.id}`} className="rounded-xl bg-surface-container-lowest p-space-lg shadow-sm transition-shadow hover:shadow-md">
            <div className="flex items-center gap-space-md">
              <Avatar name={row.agent.fullName} url={row.agent.avatarUrl || undefined} size={48} />
              <div className="min-w-0">
                <p className="truncate font-headline-sm text-headline-sm text-on-surface">{row.agent.fullName}</p>
                <p className="font-body-sm text-body-sm text-on-surface-variant">{row.agent.jobTitle}</p>
              </div>
              <Icon name="chevron_right" className="ml-auto text-outline" />
            </div>
            <dl className="mt-space-md grid grid-cols-3 gap-space-sm border-t border-outline-variant/40 pt-space-md">
              <div>
                <dt className="font-label-sm text-label-sm text-on-surface-variant">Biens en ligne</dt>
                <dd className="font-currency-display text-[20px] font-bold text-on-surface">{row.activeListings}</dd>
              </div>
              <div>
                <dt className="font-label-sm text-label-sm text-on-surface-variant">Prospects</dt>
                <dd className="font-currency-display text-[20px] font-bold text-on-surface">{row.activeLeads}</dd>
              </div>
              <div>
                <dt className="font-label-sm text-label-sm text-on-surface-variant">Conversion</dt>
                <dd className="font-currency-display text-[20px] font-bold text-on-surface">{row.conversionRate}%</dd>
              </div>
            </dl>
            <p className="mt-space-md font-body-sm text-body-sm text-on-surface-variant">
              Ce mois : {pluralize(row.monthDeals.count, "vente")} · <span className="font-semibold text-on-surface">{formatAmount(row.monthDeals.commission)} TND</span> de commission
            </p>
          </Link>
        ))}
      </div>
    </>
  );
}
