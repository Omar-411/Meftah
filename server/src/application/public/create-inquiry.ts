import type { Lead } from "../../domain/lead/lead";
import { EMPTY_CRITERIA } from "../../domain/lead/lead";
import { isValidEmail, isValidTunisianPhone } from "../../domain/shared/format";
import { newId } from "../../domain/shared/id";
import { fail, ok, type Result } from "../../domain/shared/result";
import type { Deps } from "../ports";

export interface InquiryInput {
  readonly fullName: string;
  readonly phone: string;
  readonly email: string;
  readonly message: string;
}

export function validateInquiry(input: InquiryInput): Record<string, string> {
  const fields: Record<string, string> = {};
  if (input.fullName.trim().length < 2) fields.fullName = "Indiquez votre nom.";
  if (!isValidTunisianPhone(input.phone)) fields.phone = "Numéro invalide (ex. 98 123 456).";
  if (input.email.trim() && !isValidEmail(input.email)) fields.email = "Adresse e-mail invalide.";
  if (input.message.trim().length < 5) fields.message = "Écrivez un court message.";
  return fields;
}

/**
 * A public inquiry becomes a lead in the CRM: stage "new", assigned to the listing's agent,
 * with the property attached and the listing's criteria pre-filled for matching.
 */
export async function createInquiry(
  deps: Pick<Deps, "publicListings" | "leads" | "notifications" | "agency">,
  slug: string,
  input: InquiryInput,
  now: Date,
): Promise<Result<{ leadId: string }>> {
  const fields = validateInquiry(input);
  if (Object.keys(fields).length > 0) return fail("Vérifiez les champs en rouge.", fields);

  const listing = await deps.publicListings.findBySlug(slug);
  if (!listing) return fail("Cette annonce n'est plus disponible.");

  const agency = await deps.agency.get();
  const timestamp = now.toISOString();
  const lead: Lead = {
    id: newId("lead"),
    agencyId: agency.id,
    agentId: listing.agentId,
    fullName: input.fullName.trim(),
    phone: input.phone.trim(),
    email: input.email.trim(),
    source: "website",
    stage: "new",
    lostReason: null,
    listingId: listing.id,
    message: input.message.trim(),
    criteria: {
      ...EMPTY_CRITERIA,
      transaction: listing.transaction,
      propertyTypes: [listing.propertyType],
      cityIds: [listing.cityId],
    },
    createdAt: timestamp,
    updatedAt: timestamp,
    lastContactAt: null,
  };

  await deps.leads.create(lead);
  await deps.notifications.add({
    id: newId("ntf"),
    userId: listing.agentId,
    kind: "new_lead",
    title: `Nouvelle demande : ${lead.fullName}`,
    body: `${listing.ref} · ${listing.title}`,
    href: `/crm/prospects/${lead.id}`,
    at: timestamp,
    read: false,
  });

  return ok({ leadId: lead.id });
}
