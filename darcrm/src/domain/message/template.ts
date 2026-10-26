import type { Agent } from "../agent/agent";
import type { AgencySettings } from "../agency/agency";
import type { Appointment } from "../appointment/appointment";
import type { Lead } from "../lead/lead";
import type { Listing } from "../listing/listing";

export type TemplateKey = "first_contact" | "visit_confirmation" | "visit_reminder_day" | "visit_reminder_hour" | "post_visit" | "follow_up";

export type VariableName = "prenom" | "agent" | "agence" | "bien" | "reference" | "date" | "heure" | "telephone";

export const TEMPLATE_VARIABLES: ReadonlyArray<{ name: VariableName; label: string }> = [
  { name: "prenom", label: "Prénom du prospect" },
  { name: "agent", label: "Nom de l'agent" },
  { name: "agence", label: "Nom de l'agence" },
  { name: "telephone", label: "Téléphone de l'agence" },
  { name: "bien", label: "Titre du bien" },
  { name: "reference", label: "Référence du bien" },
  { name: "date", label: "Date de la visite" },
  { name: "heure", label: "Heure de la visite" },
];

const VARIABLE_NAMES = new Set<string>(TEMPLATE_VARIABLES.map((variable) => variable.name));

export interface TemplateDefinition {
  readonly key: TemplateKey;
  readonly label: string;
  readonly description: string;
  readonly icon: string;
  readonly body: string;
  /** Sent by the system itself when the agency enables automatic visit reminders. */
  readonly automatic?: boolean;
}

export const DEFAULT_TEMPLATES: readonly TemplateDefinition[] = [
  {
    key: "first_contact",
    label: "Premier contact",
    description: "Réponse rapide à une nouvelle demande.",
    icon: "waving_hand",
    body: "Bonjour {prenom}, c'est {agent} de {agence}. Merci pour votre demande concernant {bien}. Quand seriez-vous disponible pour en parler ?",
  },
  {
    key: "visit_confirmation",
    label: "Confirmation de visite",
    description: "À envoyer dès que la visite est planifiée.",
    icon: "event_available",
    body: "Bonjour {prenom}, je vous confirme notre visite de {bien} le {date} à {heure}. Je vous attends sur place. {agent}, {agence}.",
  },
  {
    key: "visit_reminder_day",
    label: "Rappel de visite (la veille)",
    description: "Envoyé automatiquement 24 h avant la visite.",
    icon: "notifications_active",
    automatic: true,
    body: "Bonjour {prenom}, petit rappel : notre visite de {bien} a lieu le {date} à {heure}. Répondez-moi ici en cas d'empêchement. {agent}, {agence}.",
  },
  {
    key: "visit_reminder_hour",
    label: "Rappel de visite (1 heure avant)",
    description: "Envoyé automatiquement 1 h avant la visite.",
    icon: "alarm",
    automatic: true,
    body: "Bonjour {prenom}, je vous attends à {heure} pour la visite de {bien}. À tout à l'heure ! {agent}, {agence}.",
  },
  {
    key: "post_visit",
    label: "Après la visite",
    description: "Recueillir son avis à chaud.",
    icon: "rate_review",
    body: "Bonjour {prenom}, merci d'avoir visité {bien}. Qu'en avez-vous pensé ? Je reste disponible pour répondre à vos questions ou organiser une seconde visite.",
  },
  {
    key: "follow_up",
    label: "Relance",
    description: "Reprendre contact avec un prospect silencieux.",
    icon: "forward_to_inbox",
    body: "Bonjour {prenom}, je reviens vers vous pour faire le point sur votre recherche. Avez-vous eu le temps d'y réfléchir ? {agent}, {agence}.",
  },
];

export const MAX_TEMPLATE_LENGTH = 700;

/** What the agency changed: only the text, the rest comes from the built-in definition. */
export interface TemplateOverride {
  readonly id: TemplateKey;
  readonly key: TemplateKey;
  readonly body: string;
}

export interface MessageTemplate extends TemplateDefinition {
  readonly customized: boolean;
}

export const isTemplateKey = (value: string): value is TemplateKey => DEFAULT_TEMPLATES.some((template) => template.key === value);

export function mergeTemplates(overrides: readonly TemplateOverride[]): MessageTemplate[] {
  const byKey = new Map(overrides.map((override) => [override.key, override.body]));
  return DEFAULT_TEMPLATES.map((template) => {
    const custom = byKey.get(template.key);
    return custom === undefined ? { ...template, customized: false } : { ...template, body: custom, customized: true };
  });
}

/** Variables written as {name}. */
export const variablesIn = (body: string): string[] => [...body.matchAll(/\{([a-z_]+)\}/g)].map((match) => match[1] ?? "");

export function validateTemplateBody(body: string): string | null {
  const text = body.trim();
  if (text.length < 10) return "Le message est trop court.";
  if (text.length > MAX_TEMPLATE_LENGTH) return `${MAX_TEMPLATE_LENGTH} caractères maximum.`;
  const unknown = [...new Set(variablesIn(text).filter((name) => !VARIABLE_NAMES.has(name)))];
  if (unknown.length > 0) return `Variable inconnue : ${unknown.map((name) => `{${name}}`).join(", ")}.`;
  return null;
}

export type Variables = Readonly<Record<VariableName, string>>;

export interface RenderedMessage {
  readonly text: string;
  /** Variables used by the text that have no value yet (e.g. {date} when no visit is planned). */
  readonly missing: readonly VariableName[];
}

export function renderTemplate(body: string, variables: Variables): RenderedMessage {
  const missing = new Set<VariableName>();
  const text = body.replace(/\{([a-z_]+)\}/g, (placeholder, name: string) => {
    if (!VARIABLE_NAMES.has(name)) return placeholder;
    const value = variables[name as VariableName];
    if (!value) missing.add(name as VariableName);
    return value;
  });
  return { text, missing: [...missing] };
}

const TIME_ZONE = "Africa/Tunis";
const DAY = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: TIME_ZONE });
const HOUR = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: TIME_ZONE });

export interface MessageContext {
  readonly lead: Lead;
  readonly agent: Agent | null;
  readonly agency: AgencySettings;
  readonly listing: Pick<Listing, "title" | "ref"> | null;
  readonly appointment: Pick<Appointment, "startsAt"> | null;
}

export function buildVariables({ lead, agent, agency, listing, appointment }: MessageContext): Variables {
  const start = appointment ? new Date(appointment.startsAt) : null;
  return {
    prenom: lead.fullName.trim().split(/\s+/)[0] ?? "",
    agent: agent?.fullName ?? agency.name,
    agence: agency.name,
    telephone: agency.phone,
    // Without a listing the sentence still reads naturally.
    bien: listing?.title ?? "votre recherche",
    reference: listing?.ref ?? "",
    date: start ? DAY.format(start) : "",
    heure: start ? HOUR.format(start).replace(":", "h") : "",
  };
}
