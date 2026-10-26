import Link from "next/link";
import { getAdminOverview, getAgentDashboard, type AdminOverview, type AgentDashboard } from "@/application/crm/dashboard";
import { formatAmount, formatAmountCompact, formatLongDateFr, formatRelativeFr, formatTimeFr, pluralize } from "@/domain/shared/format";
import { LEAD_STAGES, SOURCE_ICONS, STAGE_LABELS } from "@/domain/lead/lead";
import { getDeps } from "@/infrastructure/container";
import { ListingThumb } from "@/components/crm/listing-thumb";
import { PageHeader } from "@/components/crm/page-header";
import { StatCard } from "@/components/crm/stat-card";
import { Amount } from "@/components/ui/amount";
import { Avatar } from "@/components/ui/avatar";
import { MonthlyBarChart } from "@/components/ui/bar-chart";
import { Icon } from "@/components/ui/icon";
import { Panel } from "@/components/ui/panel";
import { loadOrRedirect, requireStaffPage } from "./_lib/guard";

export default async function DashboardPage() {
  const session = await requireStaffPage();
  const now = new Date();
  const deps = getDeps();

  const [agent, admin] = await Promise.all([
    loadOrRedirect(() => getAgentDashboard(deps, session, now)),
    session.role === "admin" ? loadOrRedirect(() => getAdminOverview(deps, session, now)) : Promise.resolve(null),
  ]);

  return (
    <>
      <PageHeader title={`Bonjour ${session.displayName.split(" ")[0]}`} subtitle={formatLongDateFr(now)} />
      {admin && <AdminSection overview={admin} />}
      <AgentSection data={agent} isAdmin={admin !== null} />
    </>
  );
}

function AdminSection({ overview }: { overview: AdminOverview }) {
  const maxStage = Math.max(...Object.values(overview.pipeline), 1);
  return (
    <section aria-label="Vue de l'agence" className="mb-space-xl space-y-space-lg">
      <div className="grid grid-cols-2 gap-space-md lg:grid-cols-4">
        <StatCard icon="public" label="Biens en ligne" value={String(overview.listings.published)} hint={`${overview.listings.drafts} brouillon(s) · ${overview.listings.reserved} réservé(s)`} href="/crm/biens" />
        <StatCard icon="groups" label="Prospects ouverts" value={String(overview.openLeads)} hint={`${overview.unattendedLeads.length} sans réponse > 24 h`} href="/crm/prospects" />
        <StatCard icon="event" label="Visites cette semaine" value={String(overview.visitsThisWeek)} href="/crm/rendez-vous" />
        <StatCard icon="payments" label="Commissions du mois" value={`${formatAmountCompact(overview.monthDeals.commission)} TND`} hint={`${pluralize(overview.monthDeals.count, "vente")} · ${formatAmountCompact(overview.monthDeals.volume)} TND`} />
      </div>

      <div className="grid gap-space-lg lg:grid-cols-2">
        <Panel icon="bar_chart" title="Ventes sur 6 mois">
          <MonthlyBarChart buckets={overview.monthly} />
        </Panel>
        <Panel icon="filter_alt" title="Pipeline de l'agence">
          <ul className="space-y-space-sm">
            {LEAD_STAGES.map((stage) => (
              <li key={stage} className="flex items-center gap-space-sm">
                <span className="w-32 shrink-0 font-label-md text-label-md text-on-surface-variant">{STAGE_LABELS[stage]}</span>
                <span className="h-3 flex-1 overflow-hidden rounded-full bg-surface-container-low">
                  <span className="block h-full rounded-full bg-primary-container" style={{ width: `${(overview.pipeline[stage] / maxStage) * 100}%` }} />
                </span>
                <span className="w-6 text-right font-label-md text-label-md font-semibold text-on-surface">{overview.pipeline[stage]}</span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <div className="grid gap-space-lg lg:grid-cols-[1.4fr_1fr]">
        <Panel icon="leaderboard" title="Performance des agents" trailing={<Link href="/crm/agents" className="font-label-md text-label-md text-primary hover:underline">Détail</Link>}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-left">
              <thead className="font-label-sm text-label-sm text-on-surface-variant">
                <tr>
                  <th className="pb-2 font-medium">Agent</th>
                  <th className="pb-2 font-medium">Prospects</th>
                  <th className="pb-2 font-medium">Ventes du mois</th>
                  <th className="pb-2 text-right font-medium">Commission</th>
                </tr>
              </thead>
              <tbody className="font-body-md text-body-md">
                {overview.performance.map((row) => (
                  <tr key={row.agent.id} className="border-t border-outline-variant/30">
                    <td className="py-2">
                      <Link href={`/crm/agents/${row.agent.id}`} className="flex items-center gap-2 hover:underline">
                        <Avatar name={row.agent.fullName} url={row.agent.avatarUrl || undefined} size={28} />
                        {row.agent.fullName}
                      </Link>
                    </td>
                    <td className="py-2">{row.activeLeads}</td>
                    <td className="py-2">{row.monthDeals.count}</td>
                    <td className="py-2 text-right font-semibold">{formatAmount(row.monthDeals.commission)} TND</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel icon="warning" iconClassName="text-tertiary" title="Prospects sans réponse">
          {overview.unattendedLeads.length === 0 ? (
            <p className="font-body-md text-body-md text-on-surface-variant">Tous les prospects ont été contactés dans les 24 h.</p>
          ) : (
            <ul className="space-y-space-sm">
              {overview.unattendedLeads.map(({ lead, agentName }) => (
                <li key={lead.id}>
                  <Link href={`/crm/prospects/${lead.id}`} className="flex items-center justify-between gap-space-sm rounded-lg px-2 py-1.5 hover:bg-surface-container-low">
                    <span className="font-label-md text-label-md font-semibold text-on-surface">{lead.fullName}</span>
                    <span className="font-label-sm text-label-sm text-on-surface-variant">{agentName}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </section>
  );
}

function AgentSection({ data, isAdmin }: { data: AgentDashboard; isAdmin: boolean }) {
  return (
    <section aria-label={isAdmin ? "Mon activité" : "Mon tableau de bord"} className="space-y-space-lg">
      {isAdmin && <h2 className="font-display text-[20px] font-semibold text-on-surface">Mon activité</h2>}

      <div className="grid grid-cols-2 gap-space-md lg:grid-cols-4">
        <StatCard icon="groups" label="Prospects actifs" value={String(data.activeLeads)} hint={`${data.hotLeads} en négociation`} href="/crm/prospects" />
        <StatCard icon="event" label="Visites aujourd'hui" value={String(data.visitsToday)} hint={`${data.visitsThisWeek} cette semaine`} href="/crm/rendez-vous" />
        <StatCard icon="payments" label="Commission du mois" value={`${formatAmountCompact(data.monthDeals.commission)} TND`} hint={pluralize(data.monthDeals.count, "vente")} />
        <div className="rounded-xl bg-surface-container-lowest p-space-md shadow-sm">
          <div className="flex items-center gap-2 text-on-surface-variant">
            <Icon name="flag" className="text-[20px] text-primary" />
            <span className="font-label-md text-label-md">Objectif du mois</span>
          </div>
          <p className="mt-space-sm font-currency-display text-[28px] font-bold leading-none text-on-surface">{data.goal.percent}%</p>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-container-low">
            <div className="h-full rounded-full bg-secondary" style={{ width: `${data.goal.percent}%` }} />
          </div>
          <p className="mt-1 font-label-sm text-label-sm text-on-surface-variant">{data.goal.closed} / {data.goal.target} ventes</p>
        </div>
      </div>

      <div className="grid gap-space-lg lg:grid-cols-2">
        <Panel icon="today" title="Agenda du jour" trailing={<Link href="/crm/rendez-vous" className="font-label-md text-label-md text-primary hover:underline">Semaine</Link>}>
          {data.todayAgenda.length === 0 ? (
            <p className="font-body-md text-body-md text-on-surface-variant">Aucune visite aujourd'hui.</p>
          ) : (
            <ul className="space-y-space-sm">
              {data.todayAgenda.map((item) => (
                <li key={item.appointment.id} className="flex items-center gap-space-sm">
                  <span className="w-14 shrink-0 font-label-md text-label-md font-semibold text-primary">{formatTimeFr(new Date(item.appointment.startsAt))}</span>
                  <span className="min-w-0">
                    <span className="block truncate font-label-md text-label-md font-semibold text-on-surface">{item.leadName}</span>
                    <span className="block truncate font-body-sm text-body-sm text-on-surface-variant">{item.listing ? `${item.listing.ref} · ${item.listing.title}` : "Bien supprimé"}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel icon="checklist" title="À faire">
          {data.todos.length === 0 ? (
            <p className="font-body-md text-body-md text-on-surface-variant">Rien d'urgent. Bon travail !</p>
          ) : (
            <ul className="space-y-1">
              {data.todos.map((todo) => (
                <li key={todo.id}>
                  <Link href={todo.href} className="flex items-start gap-space-sm rounded-lg px-2 py-1.5 hover:bg-surface-container-low">
                    <Icon name={todo.kind === "call" ? "call" : "notification_important"} className="mt-0.5 text-[20px] text-primary" />
                    <span className="min-w-0">
                      <span className="block font-label-md text-label-md font-semibold text-on-surface">{todo.title}</span>
                      <span className="block truncate font-body-sm text-body-sm text-on-surface-variant">{todo.detail}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel icon="person_add" title="Nouveaux prospects">
          {data.newLeads.length === 0 ? (
            <p className="font-body-md text-body-md text-on-surface-variant">Aucun nouveau prospect.</p>
          ) : (
            <ul className="space-y-1">
              {data.newLeads.map(({ lead, listing }) => (
                <li key={lead.id}>
                  <Link href={`/crm/prospects/${lead.id}`} className="flex items-center gap-space-sm rounded-lg px-2 py-1.5 hover:bg-surface-container-low">
                    <Icon name={SOURCE_ICONS[lead.source]} className="text-[20px] text-on-surface-variant" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-label-md text-label-md font-semibold text-on-surface">{lead.fullName}</span>
                      <span className="block truncate font-body-sm text-body-sm text-on-surface-variant">{listing ? listing.title : lead.message}</span>
                    </span>
                    <span className="shrink-0 font-label-sm text-label-sm text-outline">{formatRelativeFr(new Date(lead.createdAt), data.now)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel icon="trending_up" title="Biens les plus demandés">
          {data.topListings.length === 0 ? (
            <p className="font-body-md text-body-md text-on-surface-variant">Publiez un bien pour recevoir des demandes.</p>
          ) : (
            <ul className="space-y-space-sm">
              {data.topListings.map(({ listing, requests, visits }) => (
                <li key={listing.id} className="flex items-center gap-space-sm">
                  <ListingThumb url={listing.photoUrl} alt={listing.photoAlt} className="h-12 w-16" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-label-md text-label-md font-semibold text-on-surface">{listing.title}</span>
                    <span className="block font-body-sm text-body-sm text-on-surface-variant">{pluralize(requests, "demande")} · {pluralize(visits, "visite")}</span>
                  </span>
                  <Amount value={listing.price} className="text-[15px]" />
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </section>
  );
}
