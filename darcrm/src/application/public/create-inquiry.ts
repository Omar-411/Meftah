import { isValidEmail, isValidTunisianPhone } from "@/domain/shared/format";
import { fail, type Result } from "@/domain/shared/result";
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
 * Validates early for instant feedback, then hands over to the gateway. The backend owns the rest:
 * a public inquiry becomes a "new" lead assigned to the listing's agent, with a notification for that agent.
 */
export async function createInquiry(
  deps: Pick<Deps, "inquiries">,
  slug: string,
  input: InquiryInput,
): Promise<Result<{ leadId: string }>> {
  const fields = validateInquiry(input);
  if (Object.keys(fields).length > 0) return fail("Vérifiez les champs en rouge.", fields);
  return deps.inquiries.create(slug, input);
}
