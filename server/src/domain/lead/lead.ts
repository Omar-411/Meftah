import type { PropertyType, TransactionType } from "../listing/catalog";

export type LeadStage = "new" | "contacted" | "visit_scheduled" | "negotiating" | "closed" | "lost";
export type LeadSource = "website" | "whatsapp" | "phone" | "referral" | "portal" | "manual";
export type ActivityKind = "call" | "visit" | "follow_up" | "whatsapp" | "email" | "note" | "stage_change" | "system";

export const LEAD_STAGES: readonly LeadStage[] = ["new", "contacted", "visit_scheduled", "negotiating", "closed", "lost"];

export const STAGE_LABELS: Record<LeadStage, string> = {
  new: "Nouveau",
  contacted: "Contacté",
  visit_scheduled: "Visite planifiée",
  negotiating: "Négociation",
  closed: "Conclu",
  lost: "Perdu",
};

export const SOURCE_LABELS: Record<LeadSource, string> = {
  website: "Site web",
  whatsapp: "WhatsApp",
  phone: "Téléphone",
  referral: "Recommandation",
  portal: "Portail partenaire",
  manual: "Saisie manuelle",
};

export const SOURCE_ICONS: Record<LeadSource, string> = {
  website: "public",
  whatsapp: "chat",
  phone: "call",
  referral: "recommend",
  portal: "campaign",
  manual: "edit_note",
};

export const ACTIVITY_LABELS: Record<ActivityKind, string> = {
  call: "Appel",
  visit: "Visite",
  follow_up: "Relance",
  whatsapp: "WhatsApp",
  email: "E-mail",
  note: "Note",
  stage_change: "Changement d'étape",
  system: "Système",
};

export const ACTIVITY_ICONS: Record<ActivityKind, string> = {
  call: "call",
  visit: "home_work",
  follow_up: "notification_important",
  whatsapp: "chat",
  email: "mail",
  note: "sticky_note_2",
  stage_change: "swap_horiz",
  system: "bolt",
};

/** Activities an agent can log by hand. */
export const LOGGABLE_ACTIVITIES: readonly ActivityKind[] = ["call", "whatsapp", "email", "visit", "follow_up", "note"];

export interface SearchCriteria {
  readonly transaction: TransactionType;
  readonly propertyTypes: readonly PropertyType[];
  readonly cityIds: readonly string[];
  readonly budgetMin?: number;
  readonly budgetMax?: number;
  readonly minRooms?: number;
  readonly minArea?: number;
}

export interface Lead {
  readonly id: string;
  readonly agencyId: string;
  readonly agentId: string;
  readonly fullName: string;
  readonly phone: string;
  readonly email: string;
  readonly source: LeadSource;
  readonly stage: LeadStage;
  readonly lostReason: string | null;
  readonly listingId: string | null;
  readonly message: string;
  readonly criteria: SearchCriteria;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly lastContactAt: string | null;
}

export interface Activity {
  readonly id: string;
  readonly leadId: string;
  readonly kind: ActivityKind;
  readonly summary: string;
  readonly authorId: string;
  readonly authorName: string;
  readonly at: string;
}

export const EMPTY_CRITERIA: SearchCriteria = { transaction: "sale", propertyTypes: [], cityIds: [] };

export function isOpenStage(stage: LeadStage): boolean {
  return stage !== "closed" && stage !== "lost";
}

export function groupByStage<T extends Pick<Lead, "stage">>(leads: readonly T[]): Record<LeadStage, T[]> {
  const groups = Object.fromEntries(LEAD_STAGES.map((stage) => [stage, [] as T[]])) as Record<LeadStage, T[]>;
  for (const lead of leads) groups[lead.stage].push(lead);
  return groups;
}

export function validateLeadInput(input: { fullName: string; phone: string }): Record<string, string> {
  const errors: Record<string, string> = {};
  if (input.fullName.trim().length < 2) errors.fullName = "Saisissez le nom complet.";
  return errors;
}
