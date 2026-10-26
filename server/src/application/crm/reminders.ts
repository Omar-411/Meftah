import { isValidTunisianPhone } from "../../domain/shared/format";
import { newId } from "../../domain/shared/id";
import { buildVariables, mergeTemplates, renderTemplate, type TemplateKey } from "../../domain/message/template";
import type { Appointment } from "../../domain/appointment/appointment";
import type { Deps, ReminderKind } from "../ports";

const HOUR_MS = 3_600_000;
const TEMPLATE_OF: Record<ReminderKind, TemplateKey> = { day: "visit_reminder_day", hour: "visit_reminder_hour" };

/**
 * Which reminders are due for a visit at `now`. The day-before reminder is skipped when the visit was booked
 * less than a couple of hours ahead: it would only repeat what the agent just said.
 */
export function dueReminders(appointment: Pick<Appointment, "startsAt" | "status">, now: Date): ReminderKind[] {
  if (appointment.status !== "scheduled") return [];
  const start = new Date(appointment.startsAt).getTime();
  const until = start - now.getTime();
  if (until <= 0) return [];
  const due: ReminderKind[] = [];
  if (until <= 24 * HOUR_MS && until > 2 * HOUR_MS) due.push("day");
  if (until <= HOUR_MS) due.push("hour");
  return due;
}

export interface ReminderRun {
  readonly sent: number;
  readonly skipped: number;
}

type ReminderDeps = Pick<Deps, "agency" | "appointments" | "leads" | "agents" | "listings" | "templates" | "reminders" | "alerts">;

/** Sends the WhatsApp reminders that are due. Safe to call every minute: each (visit, kind) is handled once. */
export async function dispatchDueReminders(deps: ReminderDeps, now: Date): Promise<ReminderRun> {
  const agency = await deps.agency.get();
  if (agency.visitRemindersEnabled !== true) return { sent: 0, skipped: 0 };

  const upcoming = await deps.appointments.list({ kind: "all" }, { from: now, to: new Date(now.getTime() + 25 * HOUR_MS) });
  const templates = mergeTemplates(await deps.templates.list());
  let sent = 0;
  let skipped = 0;

  for (const appointment of upcoming) {
    for (const kind of dueReminders(appointment, now)) {
      const id = `${appointment.id}:${kind}`;
      if (await deps.reminders.has(id)) continue;

      const lead = await deps.leads.findById(appointment.leadId);
      const reachable = lead !== null && isValidTunisianPhone(lead.phone);
      // Recorded before sending so an overlapping run can never send it twice.
      await deps.reminders.add({ id, appointmentId: appointment.id, kind, handledAt: now.toISOString(), outcome: reachable ? "sent" : "skipped" });
      if (!lead || !reachable) {
        skipped += 1;
        continue;
      }

      const [agent, listing] = await Promise.all([deps.agents.findById(appointment.agentId), deps.listings.findById(appointment.listingId)]);
      const template = templates.find((candidate) => candidate.key === TEMPLATE_OF[kind]);
      if (!template) continue;
      const { text } = renderTemplate(template.body, buildVariables({ lead, agent, agency, listing, appointment }));
      await deps.alerts.sendWhatsapp({ to: lead.phone, text });
      await deps.leads.addActivity({
        id: newId("act"),
        leadId: lead.id,
        kind: "system",
        summary: `Rappel WhatsApp envoyé automatiquement (${kind === "day" ? "la veille" : "1 h avant"} la visite).`,
        authorId: "system",
        authorName: "Système",
        at: now.toISOString(),
      });
      sent += 1;
    }
  }
  return { sent, skipped };
}
