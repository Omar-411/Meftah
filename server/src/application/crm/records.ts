/**
 * Record-level operations behind the REST endpoints (PUT /crm/leads/:id, POST /crm/deals, ...).
 * The front composes its business flows from these calls, so each one re-checks scope and invariants server-side.
 */
import type { Appointment, AppointmentStatus } from "../../domain/appointment/appointment";
import { scopeOf, type Session } from "../../domain/auth/session";
import type { Deal } from "../../domain/deal/deal";
import type { Listing } from "../../domain/listing/listing";
import type { Activity, ActivityKind, Lead, LeadStage, SearchCriteria } from "../../domain/lead/lead";
import { newId } from "../../domain/shared/id";
import { fail, ok, type Result } from "../../domain/shared/result";
import { NotFoundError } from "../errors";
import { assertCanAccess, requireAdmin, requireStaff } from "../guards";
import type { DateRange, Deps } from "../ports";
import { reassignLead } from "./leads";

export async function getListingRecord(deps: Pick<Deps, "listings">, session: Session | null, id: string): Promise<Listing> {
  const staff = requireStaff(session);
  const listing = await deps.listings.findById(id);
  if (!listing) throw new NotFoundError("Bien introuvable.");
  assertCanAccess(scopeOf(staff), listing.agentId);
  return listing;
}

export async function getLeadRecord(deps: Pick<Deps, "leads">, session: Session | null, id: string): Promise<Lead> {
  const staff = requireStaff(session);
  const lead = await deps.leads.findById(id);
  if (!lead) throw new NotFoundError("Prospect introuvable.");
  assertCanAccess(scopeOf(staff), lead.agentId);
  return lead;
}

export async function listLeadRecords(deps: Pick<Deps, "leads">, session: Session | null, query: { q?: string; stage?: LeadStage; agentId?: string }): Promise<Lead[]> {
  return deps.leads.list(scopeOf(requireStaff(session)), query);
}

/** Fields an agent may edit. Ownership changes go through `reassignLead` (admin only). */
export interface LeadPatch {
  readonly fullName: string;
  readonly phone: string;
  readonly email: string;
  readonly message: string;
  readonly stage: LeadStage;
  readonly lostReason: string | null;
  readonly listingId: string | null;
  readonly criteria: SearchCriteria;
  readonly lastContactAt: string | null;
  readonly agentId: string;
}

export async function saveLeadRecord(
  deps: Pick<Deps, "leads" | "agents" | "deals" | "notifications">,
  session: Session | null,
  id: string,
  patch: LeadPatch,
  now: Date,
): Promise<Result<Lead>> {
  let lead = await getLeadRecord(deps, session, id);

  if (patch.agentId !== lead.agentId) {
    requireAdmin(session);
    const reassigned = await reassignLead(deps, session, id, patch.agentId, now);
    if (!reassigned.ok) return reassigned;
    lead = reassigned.value;
  }
  if (patch.stage === "lost" && !patch.lostReason?.trim()) {
    return fail("Indiquez pourquoi ce prospect est perdu.", { lostReason: "Motif requis." });
  }
  if (patch.stage === "closed" && lead.stage !== "closed") {
    const deals = await deps.deals.list({ kind: "all" });
    if (!deals.some((deal) => deal.leadId === id)) return fail("Enregistrez la vente avant de conclure ce prospect.", { amount: "Vente requise." });
  }

  const updated: Lead = {
    ...lead,
    fullName: patch.fullName.trim(),
    phone: patch.phone.trim(),
    email: patch.email.trim(),
    message: patch.message.trim(),
    stage: patch.stage,
    lostReason: patch.stage === "lost" ? (patch.lostReason?.trim() ?? null) : null,
    listingId: patch.listingId,
    criteria: patch.criteria,
    lastContactAt: patch.lastContactAt,
    updatedAt: now.toISOString(),
  };
  await deps.leads.save(updated);
  return ok(updated);
}

export async function listActivityRecords(deps: Pick<Deps, "leads">, session: Session | null, leadId: string): Promise<Activity[]> {
  await getLeadRecord(deps, session, leadId);
  return deps.leads.listActivities(leadId);
}

export async function addActivityRecord(
  deps: Pick<Deps, "leads">,
  session: Session | null,
  leadId: string,
  input: { kind: ActivityKind; summary: string },
  now: Date,
): Promise<Result<Activity>> {
  const staff = requireStaff(session);
  await getLeadRecord(deps, session, leadId);
  if (input.summary.trim().length === 0) return fail("Décrivez brièvement l'échange.", { summary: "Texte requis." });
  const activity: Activity = {
    id: newId("act"),
    leadId,
    kind: input.kind,
    summary: input.summary.trim(),
    authorId: staff.userId,
    authorName: staff.displayName,
    at: now.toISOString(),
  };
  await deps.leads.addActivity(activity);
  return ok(activity);
}

export interface AppointmentQuery {
  readonly from?: Date;
  readonly to?: Date;
  readonly leadId?: string;
}

const FAR_PAST = new Date(0);
const FAR_FUTURE = new Date("2200-01-01T00:00:00Z");

export async function listAppointmentRecords(deps: Pick<Deps, "appointments" | "leads">, session: Session | null, query: AppointmentQuery): Promise<Appointment[]> {
  const scope = scopeOf(requireStaff(session));
  if (query.leadId) {
    await getLeadRecord(deps, session, query.leadId);
    return deps.appointments.listForLead(query.leadId);
  }
  const range: DateRange = { from: query.from ?? FAR_PAST, to: query.to ?? FAR_FUTURE };
  return deps.appointments.list(scope, range);
}

export async function getAppointmentRecord(deps: Pick<Deps, "appointments">, session: Session | null, id: string): Promise<Appointment> {
  const staff = requireStaff(session);
  const appointment = await deps.appointments.findById(id);
  if (!appointment) throw new NotFoundError("Rendez-vous introuvable.");
  assertCanAccess(scopeOf(staff), appointment.agentId);
  return appointment;
}

export async function updateAppointmentStatus(deps: Pick<Deps, "appointments">, session: Session | null, id: string, status: AppointmentStatus): Promise<Appointment> {
  const appointment = await getAppointmentRecord(deps, session, id);
  const updated = { ...appointment, status };
  await deps.appointments.save(updated);
  return updated;
}

export async function listDealRecords(deps: Pick<Deps, "deals">, session: Session | null, range?: DateRange): Promise<Deal[]> {
  return deps.deals.list(scopeOf(requireStaff(session)), range);
}

export interface DealInput {
  readonly leadId: string;
  readonly listingId: string;
  readonly amount: number;
  readonly commissionRate: number;
}

/** Records the sale and closes the listing. The deal belongs to the lead's agent, whoever records it. */
export async function recordDeal(
  deps: Pick<Deps, "leads" | "listings" | "deals">,
  session: Session | null,
  input: DealInput,
  now: Date,
): Promise<Result<Deal>> {
  const lead = await getLeadRecord(deps, session, input.leadId);
  if (input.amount <= 0) return fail("Renseignez le bien et le montant de la vente.", { amount: "Montant requis." });

  const listing = await deps.listings.findById(input.listingId);
  if (!listing) return fail("Bien introuvable.");

  const existing = (await deps.deals.list({ kind: "all" })).find((deal) => deal.leadId === lead.id);
  if (existing) return fail("Une vente est déjà enregistrée pour ce prospect.");

  const deal: Deal = {
    id: newId("deal"),
    agencyId: lead.agencyId,
    agentId: lead.agentId,
    leadId: lead.id,
    listingId: listing.id,
    amount: input.amount,
    commissionRate: input.commissionRate,
    closedAt: now.toISOString(),
  };
  await deps.deals.create(deal);
  await deps.listings.save({ ...listing, status: "closed", updatedAt: now.toISOString() });
  return ok(deal);
}
