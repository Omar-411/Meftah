import { scopeOf, type Session } from "../../domain/auth/session";
import { fail, ok, type Result } from "../../domain/shared/result";
import {
  buildVariables,
  isTemplateKey,
  mergeTemplates,
  renderTemplate,
  validateTemplateBody,
  DEFAULT_TEMPLATES,
  type MessageTemplate,
  type TemplateKey,
  type TemplateOverride,
  type VariableName,
} from "../../domain/message/template";
import { NotFoundError } from "../errors";
import { assertCanAccess, requireAdmin, requireStaff } from "../guards";
import type { Deps } from "../ports";
import { logActivity } from "./leads";

export async function listTemplateOverrides(deps: Pick<Deps, "templates">, session: Session | null): Promise<TemplateOverride[]> {
  requireStaff(session);
  return deps.templates.list();
}

export async function listTemplates(deps: Pick<Deps, "templates">, session: Session | null): Promise<MessageTemplate[]> {
  return mergeTemplates(await listTemplateOverrides(deps, session));
}

export async function saveTemplate(deps: Pick<Deps, "templates">, session: Session | null, key: string, body: string): Promise<Result<MessageTemplate>> {
  requireAdmin(session);
  if (!isTemplateKey(key)) throw new NotFoundError("Modèle introuvable.");
  const problem = validateTemplateBody(body);
  if (problem) return fail(problem, { body: problem });

  const text = body.trim();
  const builtIn = DEFAULT_TEMPLATES.find((template) => template.key === key);
  // Writing the original text back is the same as resetting it.
  if (builtIn?.body === text) await deps.templates.remove(key);
  else await deps.templates.save({ id: key, key, body: text });
  const saved = mergeTemplates(await deps.templates.list()).find((template) => template.key === key);
  return saved ? ok(saved) : fail("Modèle introuvable.");
}

export async function resetTemplate(deps: Pick<Deps, "templates">, session: Session | null, key: string): Promise<void> {
  requireAdmin(session);
  if (!isTemplateKey(key)) throw new NotFoundError("Modèle introuvable.");
  await deps.templates.remove(key);
}

export interface ComposedMessage {
  readonly key: TemplateKey;
  readonly label: string;
  readonly description: string;
  readonly icon: string;
  readonly text: string;
  readonly missing: readonly VariableName[];
}

export interface ComposedForLead {
  readonly phone: string;
  readonly messages: readonly ComposedMessage[];
}

/** Every template filled in for one lead, using their next planned visit (if any) for {date}, {heure} and {bien}. */
export async function composeMessages(
  deps: Pick<Deps, "templates" | "leads" | "agents" | "agency" | "appointments" | "listings">,
  session: Session | null,
  leadId: string,
  now: Date,
): Promise<ComposedForLead> {
  const staff = requireStaff(session);
  const lead = await deps.leads.findById(leadId);
  if (!lead) throw new NotFoundError("Prospect introuvable.");
  assertCanAccess(scopeOf(staff), lead.agentId);

  const [overrides, agent, agency, appointments] = await Promise.all([
    deps.templates.list(),
    deps.agents.findById(lead.agentId),
    deps.agency.get(),
    deps.appointments.listForLead(lead.id),
  ]);
  const next = appointments
    .filter((appointment) => appointment.status === "scheduled" && new Date(appointment.startsAt) >= now)
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt))[0];
  const listing = await deps.listings.findById(next?.listingId ?? lead.listingId ?? "");

  const variables = buildVariables({ lead, agent, agency, listing, appointment: next ?? null });
  const messages = mergeTemplates(overrides).map<ComposedMessage>((template) => ({
    key: template.key,
    label: template.label,
    description: template.description,
    icon: template.icon,
    ...renderTemplate(template.body, variables),
  }));
  return { phone: lead.phone, messages };
}

/** Called when the agent opens WhatsApp with a message, so the lead's journal and last-contact date stay accurate. */
export async function logMessageSent(deps: Pick<Deps, "leads">, session: Session | null, leadId: string, label: string, now: Date) {
  return logActivity(deps, session, leadId, "whatsapp", `Message WhatsApp envoyé : « ${label} ».`, now);
}
