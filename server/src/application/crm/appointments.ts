import { overlaps, type Appointment, type AppointmentStatus } from "../../domain/appointment/appointment";
import { scopeOf, type Session } from "../../domain/auth/session";
import { newId } from "../../domain/shared/id";
import { addDays } from "../../domain/shared/format";
import { fail, ok, type Result } from "../../domain/shared/result";
import { NotFoundError } from "../errors";
import { assertCanAccess, requireStaff } from "../guards";
import type { Deps } from "../ports";
import { toListingBrief, type ListingBrief } from "./types";

export interface AgendaItem {
  readonly appointment: Appointment;
  readonly leadName: string;
  readonly leadPhone: string;
  readonly listing: ListingBrief | null;
  readonly agentName: string;
}

export interface WeekAgenda {
  readonly weekStart: Date;
  readonly items: readonly AgendaItem[];
  readonly leadOptions: ReadonlyArray<{ id: string; label: string }>;
  readonly listingOptions: ReadonlyArray<{ id: string; label: string }>;
}

export async function getWeekAgenda(
  deps: Pick<Deps, "appointments" | "leads" | "listings" | "agents">,
  session: Session | null,
  weekStart: Date,
): Promise<WeekAgenda> {
  const scope = scopeOf(requireStaff(session));
  const [appointments, leads, listings, agents] = await Promise.all([
    deps.appointments.list(scope, { from: weekStart, to: addDays(weekStart, 7) }),
    deps.leads.list(scope, {}),
    deps.listings.list({ kind: "all" }, {}),
    deps.agents.list(),
  ]);
  const leadById = new Map(leads.map((lead) => [lead.id, lead]));
  const listingById = new Map(listings.map((listing) => [listing.id, toListingBrief(listing)]));
  const agentName = new Map(agents.map((agent) => [agent.id, agent.fullName]));

  const items = appointments
    .map<AgendaItem>((appointment) => ({
      appointment,
      leadName: leadById.get(appointment.leadId)?.fullName ?? "Prospect supprimé",
      leadPhone: leadById.get(appointment.leadId)?.phone ?? "",
      listing: listingById.get(appointment.listingId) ?? null,
      agentName: agentName.get(appointment.agentId) ?? "—",
    }))
    .sort((a, b) => a.appointment.startsAt.localeCompare(b.appointment.startsAt));

  return {
    weekStart,
    items,
    leadOptions: leads.filter((lead) => lead.stage !== "closed" && lead.stage !== "lost").map((lead) => ({ id: lead.id, label: lead.fullName })),
    listingOptions: listings
      .filter((listing) => listing.status === "available")
      .map((listing) => ({ id: listing.id, label: `${listing.ref} · ${listing.title}` })),
  };
}

export interface ScheduleInput {
  readonly leadId: string;
  readonly listingId: string;
  readonly startsAt: string;
  readonly durationMin: number;
  readonly notes: string;
  readonly reminderMinutesBefore: number;
}

export async function scheduleAppointment(
  deps: Pick<Deps, "appointments" | "leads" | "listings" | "notifications" | "agency">,
  session: Session | null,
  input: ScheduleInput,
  now: Date,
): Promise<Result<Appointment>> {
  const staff = requireStaff(session);
  const scope = scopeOf(staff);

  const [lead, listing] = await Promise.all([deps.leads.findById(input.leadId), deps.listings.findById(input.listingId)]);
  if (!lead) throw new NotFoundError("Prospect introuvable.");
  if (!listing) return fail("Choisissez un bien.", { listingId: "Bien requis." });
  assertCanAccess(scope, lead.agentId);

  const start = new Date(input.startsAt);
  if (Number.isNaN(start.getTime())) return fail("Date ou heure invalide.", { startsAt: "Date requise." });
  if (start.getTime() < now.getTime() - 60_000) return fail("Choisissez un horaire à venir.", { startsAt: "Horaire passé." });

  const candidate = { startsAt: input.startsAt, durationMin: input.durationMin };
  const agenda = await deps.appointments.list({ kind: "agent", agentId: lead.agentId }, { from: addDays(start, -1), to: addDays(start, 1) });
  const clash = agenda.find((existing) => existing.status === "scheduled" && overlaps(existing, candidate));
  if (clash) return fail("Cet agent a déjà un rendez-vous sur ce créneau.", { startsAt: "Créneau occupé." });

  const agency = await deps.agency.get();
  const appointment: Appointment = {
    id: newId("apt"),
    agencyId: agency.id,
    agentId: lead.agentId,
    leadId: lead.id,
    listingId: listing.id,
    startsAt: input.startsAt,
    durationMin: input.durationMin,
    status: "scheduled",
    notes: input.notes.trim(),
    reminderMinutesBefore: input.reminderMinutesBefore,
  };
  await deps.appointments.create(appointment);

  if (lead.stage === "new" || lead.stage === "contacted") {
    await deps.leads.save({ ...lead, stage: "visit_scheduled", updatedAt: now.toISOString() });
  }
  if (input.reminderMinutesBefore > 0) {
    await deps.notifications.add({
      id: newId("ntf"),
      userId: lead.agentId,
      kind: "reminder",
      title: `Visite avec ${lead.fullName}`,
      body: `${listing.ref} · ${listing.title}`,
      href: "/crm/rendez-vous",
      at: new Date(start.getTime() - input.reminderMinutesBefore * 60_000).toISOString(),
      read: false,
    });
  }
  return ok(appointment);
}

export async function setAppointmentStatus(
  deps: Pick<Deps, "appointments">,
  session: Session | null,
  id: string,
  status: AppointmentStatus,
): Promise<void> {
  const staff = requireStaff(session);
  const appointment = await deps.appointments.findById(id);
  if (!appointment) throw new NotFoundError("Rendez-vous introuvable.");
  assertCanAccess(scopeOf(staff), appointment.agentId);
  await deps.appointments.save({ ...appointment, status });
}
