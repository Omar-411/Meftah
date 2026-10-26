import type { Agent } from "@/domain/agent/agent";
import type { Appointment } from "@/domain/appointment/appointment";
import { scopeOf, type Session } from "@/domain/auth/session";
import { dealsByMonth, isInMonth, summarizeDeals, type DealSummary, type MonthBucket } from "@/domain/deal/deal";
import { isPubliclyVisible } from "@/domain/listing/listing";
import { groupByStage, isOpenStage, LEAD_STAGES, type Lead, type LeadStage } from "@/domain/lead/lead";
import { addDays, formatMonthShortFr, isSameDay, startOfDay, startOfWeek } from "@/domain/shared/format";
import { requireAdmin, requireStaff } from "../guards";
import type { Deps } from "../ports";
import { getWeekAgenda, type AgendaItem } from "./appointments";
import { toListingBrief, type ListingBrief } from "./types";

export const MONTHLY_DEAL_TARGET = 3;
export const FOLLOW_UP_AFTER_DAYS = 3;

export interface TodoItem {
  readonly id: string;
  readonly kind: "call" | "follow_up";
  readonly title: string;
  readonly detail: string;
  readonly href: string;
}

export interface AgentDashboard {
  readonly agent: Agent;
  readonly now: Date;
  readonly activeLeads: number;
  readonly hotLeads: number;
  readonly newLeads: readonly { lead: Lead; listing: ListingBrief | null }[];
  readonly visitsThisWeek: number;
  readonly visitsToday: number;
  readonly todayAgenda: readonly AgendaItem[];
  readonly todos: readonly TodoItem[];
  readonly monthDeals: DealSummary;
  readonly goal: { readonly closed: number; readonly target: number; readonly percent: number };
  readonly topListings: readonly { listing: ListingBrief; requests: number; visits: number }[];
}

export async function getAgentDashboard(
  deps: Pick<Deps, "agents" | "leads" | "listings" | "appointments" | "deals">,
  session: Session | null,
  now: Date,
): Promise<AgentDashboard> {
  const staff = requireStaff(session);
  const scope = scopeOf(staff);
  const weekStart = startOfWeek(now);

  const [agent, leads, listings, deals, weekAgenda] = await Promise.all([
    deps.agents.findById(staff.userId),
    deps.leads.list(scope, {}),
    deps.listings.list(scope, {}),
    deps.deals.list(scope),
    getWeekAgenda(deps, session, weekStart),
  ]);
  if (!agent) throw new Error("Agent introuvable pour la session courante.");

  const briefById = new Map(listings.map((listing) => [listing.id, toListingBrief(listing)]));
  const open = leads.filter((lead) => isOpenStage(lead.stage));
  const scheduled = weekAgenda.items.filter((item) => item.appointment.status === "scheduled");
  const todayAgenda = weekAgenda.items.filter((item) => isSameDay(new Date(item.appointment.startsAt), now));

  const monthDeals = summarizeDeals(deals.filter((deal) => isInMonth(deal, now)));
  const staleBefore = addDays(startOfDay(now), -FOLLOW_UP_AFTER_DAYS).getTime();

  const todos: TodoItem[] = [
    ...open
      .filter((lead) => lead.stage === "new")
      .map<TodoItem>((lead) => ({
        id: `call-${lead.id}`,
        kind: "call",
        title: `Rappeler ${lead.fullName}`,
        detail: lead.message || "Nouveau prospect à qualifier",
        href: `/crm/prospects/${lead.id}`,
      })),
    ...open
      .filter((lead) => lead.stage !== "new" && new Date(lead.lastContactAt ?? lead.createdAt).getTime() < staleBefore)
      .map<TodoItem>((lead) => ({
        id: `follow-${lead.id}`,
        kind: "follow_up",
        title: `Relancer ${lead.fullName}`,
        detail: `Sans contact depuis plus de ${FOLLOW_UP_AFTER_DAYS} jours`,
        href: `/crm/prospects/${lead.id}`,
      })),
  ].slice(0, 6);

  const topListings = listings
    .filter((listing) => isPubliclyVisible(listing) || listing.status === "reserved")
    .map((listing) => ({
      listing: toListingBrief(listing),
      requests: leads.filter((lead) => lead.listingId === listing.id).length,
      visits: weekAgenda.items.filter((item) => item.appointment.listingId === listing.id).length,
    }))
    .sort((a, b) => b.requests - a.requests)
    .slice(0, 3);

  return {
    agent,
    now,
    activeLeads: open.length,
    hotLeads: open.filter((lead) => lead.stage === "negotiating").length,
    newLeads: open
      .filter((lead) => lead.stage === "new")
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 4)
      .map((lead) => ({ lead, listing: lead.listingId ? (briefById.get(lead.listingId) ?? null) : null })),
    visitsThisWeek: scheduled.length,
    visitsToday: todayAgenda.filter((item) => item.appointment.status === "scheduled").length,
    todayAgenda,
    todos,
    monthDeals,
    goal: {
      closed: monthDeals.count,
      target: MONTHLY_DEAL_TARGET,
      percent: Math.min(100, Math.round((monthDeals.count / MONTHLY_DEAL_TARGET) * 100)),
    },
    topListings,
  };
}

export interface AgentPerformanceRow {
  readonly agent: Agent;
  readonly activeLeads: number;
  readonly activeListings: number;
  readonly monthDeals: DealSummary;
  readonly totalDeals: DealSummary;
  readonly conversionRate: number;
}

export interface AdminOverview {
  readonly now: Date;
  readonly listings: {
    readonly published: number;
    readonly drafts: number;
    readonly reserved: number;
    readonly closed: number;
  };
  readonly pipeline: Readonly<Record<LeadStage, number>>;
  readonly openLeads: number;
  readonly unattendedLeads: readonly { lead: Lead; agentName: string }[];
  readonly monthDeals: DealSummary;
  readonly monthly: readonly MonthBucket[];
  readonly performance: readonly AgentPerformanceRow[];
  readonly visitsThisWeek: number;
}

export async function getAdminOverview(
  deps: Pick<Deps, "agents" | "leads" | "listings" | "appointments" | "deals">,
  session: Session | null,
  now: Date,
): Promise<AdminOverview> {
  requireAdmin(session);
  const all = { kind: "all" } as const;
  const weekStart = startOfWeek(now);
  const [agents, leads, listings, deals, appointments] = await Promise.all([
    deps.agents.list(),
    deps.leads.list(all, {}),
    deps.listings.list(all, {}),
    deps.deals.list(all),
    deps.appointments.list(all, { from: weekStart, to: addDays(weekStart, 7) }),
  ]);

  const grouped = groupByStage(leads);
  const pipeline = Object.fromEntries(LEAD_STAGES.map((stage) => [stage, grouped[stage].length])) as Record<LeadStage, number>;
  const agentName = new Map(agents.map((agent) => [agent.id, agent.fullName]));

  const performance = agents
    .filter((agent) => agent.role === "agent")
    .map<AgentPerformanceRow>((agent) => {
      const own = leads.filter((lead) => lead.agentId === agent.id);
      const ownDeals = deals.filter((deal) => deal.agentId === agent.id);
      return {
        agent,
        activeLeads: own.filter((lead) => isOpenStage(lead.stage)).length,
        activeListings: listings.filter((listing) => listing.agentId === agent.id && isPubliclyVisible(listing)).length,
        monthDeals: summarizeDeals(ownDeals.filter((deal) => isInMonth(deal, now))),
        totalDeals: summarizeDeals(ownDeals),
        conversionRate: own.length === 0 ? 0 : Math.round((own.filter((lead) => lead.stage === "closed").length / own.length) * 100),
      };
    })
    .sort((a, b) => b.monthDeals.volume - a.monthDeals.volume);

  return {
    now,
    listings: {
      published: listings.filter(isPubliclyVisible).length,
      drafts: listings.filter((listing) => listing.visibility === "draft").length,
      reserved: listings.filter((listing) => listing.status === "reserved").length,
      closed: listings.filter((listing) => listing.status === "closed").length,
    },
    pipeline,
    openLeads: leads.filter((lead) => isOpenStage(lead.stage)).length,
    unattendedLeads: leads
      .filter((lead) => lead.stage === "new" && now.getTime() - new Date(lead.createdAt).getTime() > 24 * 3_600_000)
      .map((lead) => ({ lead, agentName: agentName.get(lead.agentId) ?? "—" })),
    monthDeals: summarizeDeals(deals.filter((deal) => isInMonth(deal, now))),
    monthly: dealsByMonth(deals, now, 6, formatMonthShortFr),
    performance,
    visitsThisWeek: appointments.filter((appointment) => appointment.status === "scheduled").length,
  };
}

export type { Appointment };
