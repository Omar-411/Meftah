import { scopeOf, type Session } from "@/domain/auth/session";
import { isOpenStage, type Lead } from "@/domain/lead/lead";
import { addDays, startOfDay, toDateKey } from "@/domain/shared/format";
import { isDueOn, isOverdue, type Task } from "@/domain/task/task";
import { requireStaff } from "../guards";
import type { Deps } from "../ports";
import { getWeekAgenda, type AgendaItem } from "./appointments";
import { FOLLOW_UP_AFTER_DAYS } from "./dashboard";
import { toListingBrief, type ListingBrief } from "./types";

export interface TaskItem {
  readonly task: Task;
  readonly lead: Lead | null;
}

export interface NewLeadItem {
  readonly lead: Lead;
  readonly listing: ListingBrief | null;
}

export interface CoolingLeadItem {
  readonly lead: Lead;
  readonly daysSinceContact: number;
}

/** Everything an agent has to act on today, most urgent first. */
export interface TodayView {
  readonly now: Date;
  readonly dayKey: string;
  readonly overdue: readonly TaskItem[];
  readonly dueToday: readonly TaskItem[];
  readonly visits: readonly AgendaItem[];
  readonly newLeads: readonly NewLeadItem[];
  readonly cooling: readonly CoolingLeadItem[];
  readonly leadOptions: ReadonlyArray<{ id: string; label: string }>;
  /** Number of things waiting for the agent (the "inbox" figure). */
  readonly pendingCount: number;
}

export async function getTodayView(deps: Pick<Deps, "tasks" | "leads" | "listings" | "appointments" | "agents">, session: Session | null, now: Date): Promise<TodayView> {
  const staff = requireStaff(session);
  const scope = scopeOf(staff);
  const dayKey = toDateKey(now);

  const [tasks, leads, listings, agenda] = await Promise.all([
    deps.tasks.list(scope, {}),
    deps.leads.list(scope, {}),
    deps.listings.list(scope, {}),
    getWeekAgenda(deps, session, startOfDay(now)),
  ]);
  const leadById = new Map(leads.map((lead) => [lead.id, lead]));
  const briefById = new Map(listings.map((listing) => [listing.id, toListingBrief(listing)]));
  const withLead = (task: Task): TaskItem => ({ task, lead: task.leadId ? (leadById.get(task.leadId) ?? null) : null });

  const byDueDate = (a: TaskItem, b: TaskItem) => a.task.dueDate.localeCompare(b.task.dueDate) || a.task.createdAt.localeCompare(b.task.createdAt);
  const overdue = tasks.filter((task) => isOverdue(task, dayKey)).map(withLead).sort(byDueDate);
  const dueToday = tasks.filter((task) => isDueOn(task, dayKey)).map(withLead).sort(byDueDate);

  const visits = agenda.items.filter((item) => item.appointment.status === "scheduled" && toDateKey(new Date(item.appointment.startsAt)) === dayKey);

  const open = leads.filter((lead) => isOpenStage(lead.stage));
  const newLeads = open
    .filter((lead) => lead.stage === "new")
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .map<NewLeadItem>((lead) => ({ lead, listing: lead.listingId ? (briefById.get(lead.listingId) ?? null) : null }));

  // A lead that already has a planned task is being handled: listing it again as "to follow up" would be noise.
  const plannedLeadIds = new Set(tasks.filter((task) => task.leadId).map((task) => task.leadId));
  const staleBefore = addDays(startOfDay(now), -FOLLOW_UP_AFTER_DAYS).getTime();
  const cooling = open
    .filter((lead) => lead.stage !== "new" && !plannedLeadIds.has(lead.id))
    .map((lead) => ({ lead, last: new Date(lead.lastContactAt ?? lead.createdAt).getTime() }))
    .filter(({ last }) => last < staleBefore)
    .sort((a, b) => a.last - b.last)
    .map<CoolingLeadItem>(({ lead, last }) => ({ lead, daysSinceContact: Math.floor((now.getTime() - last) / 86_400_000) }));

  return {
    now,
    dayKey,
    overdue,
    dueToday,
    visits,
    newLeads,
    cooling,
    leadOptions: open.map((lead) => ({ id: lead.id, label: lead.fullName })).sort((a, b) => a.label.localeCompare(b.label, "fr")),
    pendingCount: overdue.length + dueToday.length + visits.length + newLeads.length + cooling.length,
  };
}
