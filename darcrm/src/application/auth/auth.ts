import type { Session } from "@/domain/auth/session";
import { isValidEmail, isValidTunisianPhone } from "@/domain/shared/format";
import { fail, ok, type Result } from "@/domain/shared/result";
import type { Deps } from "../ports";

export async function login(deps: Pick<Deps, "auth">, email: string, password: string): Promise<Result<Session>> {
  const fields: Record<string, string> = {};
  if (email.trim().length === 0) fields.email = "Saisissez votre e-mail.";
  else if (!isValidEmail(email)) fields.email = "Adresse e-mail invalide.";
  if (password.length === 0) fields.password = "Saisissez votre mot de passe.";
  if (Object.keys(fields).length > 0) return fail("Complétez les champs signalés.", fields);
  const session = await deps.auth.login(email.trim().toLowerCase(), password);
  return session ? ok(session) : fail("E-mail ou mot de passe incorrect.");
}

export interface RegisterInput {
  readonly fullName: string;
  readonly email: string;
  readonly phone: string;
  readonly password: string;
}

export async function register(deps: Pick<Deps, "auth">, input: RegisterInput): Promise<Result<Session>> {
  const fields: Record<string, string> = {};
  if (input.fullName.trim().length < 2) fields.fullName = "Indiquez votre nom.";
  if (!isValidEmail(input.email)) fields.email = "Adresse e-mail invalide.";
  if (!isValidTunisianPhone(input.phone)) fields.phone = "Numéro invalide (ex. 98 123 456).";
  if (input.password.length < 8) fields.password = "8 caractères minimum.";
  if (Object.keys(fields).length > 0) return fail("Vérifiez les champs en rouge.", fields);
  return deps.auth.registerUser({ ...input, email: input.email.trim().toLowerCase() });
}
