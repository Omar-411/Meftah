import type { Metadata } from "next";
import Link from "next/link";
import { getAgentDetail } from "@/application/crm/admin";
import { formatAmount, formatShortDateFr, telLink, whatsappLink } from "@/domain/shared/format";
import { getDeps } from "@/infrastructure/container";
import { PageHeader } from "@/components/crm/page-header";
import { StatCard } from "@/components/crm/stat-card";
import { Avatar } from "@/components/ui/avatar";
import { ButtonLink } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Panel } from "@/components/ui/panel";
import { loadOrRedirect, requireAdminPage } from "../../_lib/guard";

export const metadata: Metadata = { title: "Agent" };

export default async function AgentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireAdminPage();
  const { row, deals } = await loadOrRedirect(() => getAgentDetail(getDeps(), session, id, new Date()));
  const { agent } = row;

  return (
    <>
      <PageHeader
        title={agent.fullName}
        subtitle={agent.jobTitle}
        actions={
          <>
            <ButtonLink href={telLink(agent.phone)} variant="secondary" size="sm"><Icon name="call" className="text-[18px]" />Appeler</ButtonLink>
            <ButtonLink href={whatsappLink(agent.whatsapp)} variant="whatsapp" size="sm"><Icon name="chat" className="text-[18px]" />WhatsApp</ButtonLink>
          </>
        }
      />

      <div className="mb-space-lg grid grid-cols-2 gap-space-md lg:grid-cols-4">
        <StatCard icon="home_work" label="Biens en ligne" value={String(row.activeListings)} href={`/crm/biens`} />
        <StatCard icon="groups" label="Prospects ouverts" value={String(row.activeLeads)} href={`/crm/prospects?agent=${agent.id}`} />
        <StatCard icon="verified" label="Ventes totales" value={String(row.totalDeals.count)} hint={`${formatAmount(row.totalDeals.volume)} TND`} />
        <StatCard icon="payments" label="Commissions totales" value={`${formatAmount(row.totalDeals.commission)} TND`} hint={`Taux par défaut ${agent.defaultCommissionRate}%`} />
      </div>

      <Panel icon="receipt_long" title="Ventes et commissions">
        {deals.length === 0 ? (
          <p className="font-body-md text-body-md text-on-surface-variant">Aucune vente conclue pour le moment.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left">
              <thead className="font-label-sm text-label-sm text-on-surface-variant">
                <tr>
                  <th className="pb-2 font-medium">Date</th>
                  <th className="pb-2 font-medium">Bien</th>
                  <th className="pb-2 font-medium">Client</th>
                  <th className="pb-2 text-right font-medium">Montant</th>
                  <th className="pb-2 text-right font-medium">Commission</th>
                </tr>
              </thead>
              <tbody className="font-body-md text-body-md">
                {deals.map(({ deal, commission, leadName, listing }) => (
                  <tr key={deal.id} className="border-t border-outline-variant/30">
                    <td className="py-2">{formatShortDateFr(new Date(deal.closedAt))}</td>
                    <td className="py-2">{listing ? <Link href={`/crm/biens/${listing.ref}/modifier`} className="hover:underline">{listing.title}</Link> : "—"}</td>
                    <td className="py-2">{leadName}</td>
                    <td className="py-2 text-right">{formatAmount(deal.amount)} TND</td>
                    <td className="py-2 text-right font-semibold">{formatAmount(commission)} TND <span className="font-normal text-on-surface-variant">({deal.commissionRate}%)</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <div className="mt-space-md flex items-center gap-space-sm">
        <Avatar name={agent.fullName} url={agent.avatarUrl || undefined} size={28} />
        <span className="font-body-sm text-body-sm text-on-surface-variant">{agent.email} · {agent.phone}</span>
      </div>
    </>
  );
}
