import type { Agent } from "../../domain/agent/agent";
import type { Appointment } from "../../domain/appointment/appointment";
import { scopeOf, type Session } from "../../domain/auth/session";
import type { Deal } from "../../domain/deal/deal";
import { EMPTY_CRITERIA, STAGE_LABELS, validateLeadInput, type Activity, type ActivityKind, type Lead, type LeadSource, type LeadStage, type SearchCriteria } from "../../domain/lead/lead";
import { rankMatches, type MatchResult } from "../../domain/matching/matching";
import { newId } from "../../domain/shared/id";
import { fail, ok, type Result } from "../../domain/shared/result";
import { NotFoundError } from "../errors";
import { assertCanAccess, requireAdmin, requireStaff } from "../guards";
import type { Deps, LeadQuery } from "../ports";
import { toListingBrief, type ListingBrief } from "./types";

export interface LeadCard {
  readonly lead: Lead;
  readonly listing: ListingBrief | null;
  readonly agentName: string;
}

export async function listLeads(deps: Pick<Deps, "leads" | "listings" | "agents">, session: Session | null, query: LeadQuery): Promise<LeadCard[]> {
  const staff = requireStaff(session);
  const scope = scopeOf(staff);
  const [leads, listings, agents] = await Promise.all([
    deps.leads.list(scope, query),
    deps.listings.list({ kind: "all" }, {}),
    deps.agents.list(),
  ]);
  const listingById = new Map(listings.map((listing) => [listing.id, toListingBrief(listing)]));
  const agentName = new Map(agents.map((agent) => [agent.id, agent.fullName]));
  return leads.map((lead) => ({
    lead,
    listing: lead.listingId ? (listingById.get(lead.listingId) ?? null) : null,
    agentName: agentName.get(lead.agentId) ?? "—",
  }));
}

export interface AppointmentWithListing {
  readonly appointment: Appointment;
  readonly listing: ListingBrief | null;
}

export interface MatchedListing {
  readonly match: MatchResult;
  readonly listing: ListingBrief;
}

export interface LeadDetailView {
  readonly lead: Lead;
  readonly agent: Agent;
  readonly agents: readonly Agent[];
  readonly listing: ListingBrief | null;
  readonly activities: readonly Activity[];
  readonly appointments: readonly AppointmentWithListing[];
  readonly matches: readonly MatchedListing[];
  readonly deal: Deal | null;
}

export async function getLeadDetail(deps: Pick<Deps, "leads" | "listings" | "agents" | "appointments" | "deals">, session: Session | null, id: string): Promise<LeadDetailView> {
  const staff = requireStaff(session);
  const scope = scopeOf(staff);
  const lead = await deps.leads.findById(id);
  if (!lead) throw new NotFoundError("Prospect introuvable.");
  assertCanAccess(scope, lead.agentId);

  const [agents, listings, activities, appointments, deals] = await Promise.all([
    deps.agents.list(),
    deps.listings.list({ kind: "all" }, {}),
    deps.leads.listActivities(id),
    deps.appointments.listForLead(id),
    deps.deals.list({ kind: "all" }),
  ]);
  const agent = agents.find((candidate) => candidate.id === lead.agentId);
  if (!agent) throw new NotFoundError();

  const briefById = new Map(listings.map((listing) => [listing.id, toListingBrief(listing)]));
  const matches = rankMatches(lead.criteria, listings).flatMap((match) => {
    const listing = briefById.get(match.listingId);
    return listing ? [{ match, listing }] : [];
  });

  return {
    lead,
    agent,
    agents,
    listing: lead.listingId ? (briefById.get(lead.listingId) ?? null) : null,
    activities: [...activities].sort((a, b) => b.at.localeCompare(a.at)),
    appointments: appointments.map((appointment) => ({ appointment, listing: briefById.get(appointment.listingId) ?? null })),
    matches: matches.slice(0, 6),
    deal: deals.find((deal) => deal.leadId === id) ?? null,
  };
}

export interface CreateLeadInput {
  readonly fullName: string;
  readonly phone: string;
  readonly email: string;
  readonly source: LeadSource;
  readonly message: string;
  readonly listingId: string | null;
  readonly criteria: SearchCriteria;
}

export async function createLead(deps: Pick<Deps, "leads" | "agency">, session: Session | null, input: CreateLeadInput, now: Date): Promise<Result<Lead>> {
  const staff = requireStaff(session);
  const fields = validateLeadInput(input);
  if (Object.keys(fields).length > 0) return fail("Corrigez les champs signalés.", fields);
  const agency = await deps.agency.get();
  const timestamp = now.toISOString();
  const lead: Lead = {
    id: newId("lead"),
    agencyId: agency.id,
    agentId: staff.userId,
    fullName: input.fullName.trim(),
    phone: input.phone.trim(),
    email: input.email.trim(),
    source: input.source,
    stage: "new",
    lostReason: null,
    listingId: input.listingId,
    message: input.message.trim(),
    criteria: input.criteria ?? EMPTY_CRITERIA,
    createdAt: timestamp,
    updatedAt: timestamp,
    lastContactAt: null,
  };
  return ok(await deps.leads.create(lead));
}

async function loadOwnedLead(deps: Pick<Deps, "leads">, session: Session | null, id: string): Promise<{ lead: Lead; staffId: string; staffName: string }> {
  const staff = requireStaff(session);
  const lead = await deps.leads.findById(id);
  if (!lead) throw new NotFoundError("Prospect introuvable.");
  assertCanAccess(scopeOf(staff), lead.agentId);
  return { lead, staffId: staff.userId, staffName: staff.displayName };
}

export interface CloseDealInput {
  readonly listingId: string;
  readonly amount: number;
  readonly commissionRate: number;
}

export async function moveLeadStage(
  deps: Pick<Deps, "leads" | "deals" | "listings">,
  session: Session | null,
  id: string,
  stage: LeadStage,
  options: { lostReason?: string; deal?: CloseDealInput },
  now: Date,
): Promise<Result<Lead>> {
  const { lead, staffId, staffName } = await loadOwnedLead(deps, session, id);
  if (lead.stage === stage) return ok(lead);

  if (stage === "lost" && !options.lostReason?.trim()) {
    return fail("Indiquez pourquoi ce prospect est perdu.", { lostReason: "Motif requis." });
  }
  if (stage === "closed") {
    const deal = options.deal;
    if (!deal || deal.amount <= 0 || !deal.listingId) {
      return fail("Renseignez le bien et le montant de la vente.", { amount: "Montant requis." });
    }
    const listing = await deps.listings.findById(deal.listingId);
    if (!listing) return fail("Bien introuvable.");
    await deps.deals.create({
      id: newId("deal"),
      agencyId: lead.agencyId,
      agentId: lead.agentId,
      leadId: lead.id,
      listingId: listing.id,
      amount: deal.amount,
      commissionRate: deal.commissionRate,
      closedAt: now.toISOString(),
    });
    await deps.listings.save({ ...listing, status: "closed", updatedAt: now.toISOString() });
  }

  const timestamp = now.toISOString();
  const updated: Lead = {
    ...lead,
    stage,
    lostReason: stage === "lost" ? (options.lostReason?.trim() ?? null) : null,
    updatedAt: timestamp,
  };
  await deps.leads.save(updated);
  await deps.leads.addActivity({
    id: newId("act"),
    leadId: lead.id,
    kind: "stage_change",
    summary: `${STAGE_LABELS[lead.stage]} → ${STAGE_LABELS[stage]}`,
    authorId: staffId,
    authorName: staffName,
    at: timestamp,
  });
  return ok(updated);
}

export async function logActivity(
  deps: Pick<Deps, "leads">,
  session: Session | null,
  leadId: string,
  kind: ActivityKind,
  summary: string,
  now: Date,
): Promise<Result<Activity>> {
  if (summary.trim().length === 0) return fail("Décrivez brièvement l'échange.", { summary: "Texte requis." });
  const { lead, staffId, staffName } = await loadOwnedLead(deps, session, leadId);
  const timestamp = now.toISOString();
  const activity: Activity = { id: newId("act"), leadId, kind, summary: summary.trim(), authorId: staffId, authorName: staffName, at: timestamp };
  await deps.leads.addActivity(activity);

  const isContact = kind === "call" || kind === "whatsapp" || kind === "email" || kind === "visit";
  const stage: LeadStage = lead.stage === "new" && isContact ? "contacted" : lead.stage;
  await deps.leads.save({ ...lead, stage, lastContactAt: isContact ? timestamp : lead.lastContactAt, updatedAt: timestamp });
  return ok(activity);
}

export async function reassignLead(
  deps: Pick<Deps, "leads" | "agents" | "notifications">,
  session: Session | null,
  leadId: string,
  agentId: string,
  now: Date,
): Promise<Result<Lead>> {
  requireAdmin(session);
  const lead = await deps.leads.findById(leadId);
  if (!lead) throw new NotFoundError("Prospect introuvable.");
  const agent = await deps.agents.findById(agentId);
  if (!agent) return fail("Agent introuvable.");

  const updated = { ...lead, agentId, updatedAt: now.toISOString() };
  await deps.leads.save(updated);
  await deps.notifications.add({
    id: newId("ntf"),
    userId: agentId,
    kind: "lead_assigned",
    title: `Prospect assigné : ${lead.fullName}`,
    body: "Un administrateur vous a confié ce prospect.",
    href: `/crm/prospects/${lead.id}`,
    at: now.toISOString(),
    read: false,
  });
  return ok(updated);
}

export async function updateLeadCriteria(deps: Pick<Deps, "leads">, session: Session | null, leadId: string, criteria: SearchCriteria, now: Date): Promise<Result<Lead>> {
  const { lead } = await loadOwnedLead(deps, session, leadId);
  const updated = { ...lead, criteria, updatedAt: now.toISOString() };
  await deps.leads.save(updated);
  return ok(updated);
}
