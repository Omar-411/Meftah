import type { AgencySettings } from "../../domain/agency/agency";
import type { Agent } from "../../domain/agent/agent";
import type { Session } from "../../domain/auth/session";
import type { CrmNotification } from "../../domain/account/account";
import { commissionOf, type Deal } from "../../domain/deal/deal";
import { fail, ok, type Result } from "../../domain/shared/result";
import { isValidEmail, isValidTunisianPhone } from "../../domain/shared/format";
import { NotFoundError } from "../errors";
import { requireAdmin, requireStaff } from "../guards";
import type { Deps } from "../ports";
import { getAdminOverview, type AgentPerformanceRow } from "./dashboard";
import { toListingBrief, type ListingBrief } from "./types";

export async function listAgentPerformance(deps: Pick<Deps, "agents" | "leads" | "listings" | "appointments" | "deals">, session: Session | null, now: Date): Promise<AgentPerformanceRow[]> {
  const overview = await getAdminOverview(deps, session, now);
  return [...overview.performance];
}

export interface AgentDetailView {
  readonly row: AgentPerformanceRow;
  readonly deals: readonly { deal: Deal; commission: number; leadName: string; listing: ListingBrief | null }[];
}

export async function getAgentDetail(deps: Pick<Deps, "agents" | "leads" | "listings" | "appointments" | "deals">, session: Session | null, agentId: string, now: Date): Promise<AgentDetailView> {
  requireAdmin(session);
  const rows = await listAgentPerformance(deps, session, now);
  const row = rows.find((candidate) => candidate.agent.id === agentId);
  if (!row) throw new NotFoundError("Agent introuvable.");

  const [deals, leads, listings] = await Promise.all([
    deps.deals.list({ kind: "agent", agentId }),
    deps.leads.list({ kind: "all" }, {}),
    deps.listings.list({ kind: "all" }, {}),
  ]);
  const leadName = new Map(leads.map((lead) => [lead.id, lead.fullName]));
  const brief = new Map(listings.map((listing) => [listing.id, toListingBrief(listing)]));
  return {
    row,
    deals: [...deals]
      .sort((a, b) => b.closedAt.localeCompare(a.closedAt))
      .map((deal) => ({ deal, commission: commissionOf(deal), leadName: leadName.get(deal.leadId) ?? "—", listing: brief.get(deal.listingId) ?? null })),
  };
}

export async function listAgentOptions(deps: Pick<Deps, "agents">, session: Session | null): Promise<Agent[]> {
  requireStaff(session);
  return deps.agents.list();
}

export function getAgencySettings(deps: Pick<Deps, "agency">, session: Session | null): Promise<AgencySettings> {
  requireAdmin(session);
  return deps.agency.get();
}

export async function saveAgencySettings(deps: Pick<Deps, "agency">, session: Session | null, settings: AgencySettings): Promise<Result<AgencySettings>> {
  requireAdmin(session);
  const fields: Record<string, string> = {};
  if (settings.name.trim().length < 2) fields.name = "Indiquez le nom de l'agence.";
  if (!isValidTunisianPhone(settings.phone)) fields.phone = "Numéro invalide.";
  if (!isValidTunisianPhone(settings.whatsapp)) fields.whatsapp = "Numéro invalide.";
  if (!isValidEmail(settings.email)) fields.email = "Adresse e-mail invalide.";
  if (Object.keys(fields).length > 0) return fail("Corrigez les champs signalés.", fields);
  await deps.agency.save(settings);
  return ok(settings);
}

export async function listNotifications(deps: Pick<Deps, "notifications">, session: Session | null, now: Date): Promise<CrmNotification[]> {
  const staff = requireStaff(session);
  const all = await deps.notifications.listFor(staff.userId);
  return all.filter((notification) => new Date(notification.at) <= now).sort((a, b) => b.at.localeCompare(a.at)).slice(0, 12);
}

export async function markNotificationsRead(deps: Pick<Deps, "notifications">, session: Session | null): Promise<void> {
  const staff = requireStaff(session);
  await deps.notifications.markAllRead(staff.userId);
}
