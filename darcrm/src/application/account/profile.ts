import type { Agent } from "../../domain/agent/agent";
import type { Role, Session } from "../../domain/auth/session";
import { isStaff } from "../../domain/auth/session";
import { isValidTunisianPhone } from "../../domain/shared/format";
import { fail, ok, type Result } from "../../domain/shared/result";
import { ForbiddenError, NotFoundError } from "../errors";
import type { Deps } from "../ports";

/** One shape for every role. `whatsapp` and `jobTitle` only exist for agency staff. */
export interface Profile {
  readonly id: string;
  readonly role: Role;
  readonly fullName: string;
  readonly email: string;
  readonly phone: string;
  readonly whatsapp?: string;
  readonly jobTitle?: string;
}

export interface ProfileInput {
  readonly fullName: string;
  readonly phone: string;
  readonly whatsapp?: string;
  readonly jobTitle?: string;
}

function fromAgent(agent: Agent): Profile {
  return { id: agent.id, role: agent.role, fullName: agent.fullName, email: agent.email, phone: agent.phone, whatsapp: agent.whatsapp, jobTitle: agent.jobTitle };
}

function requireSession(session: Session | null): Session {
  if (!session) throw new ForbiddenError("Connectez-vous pour continuer.");
  return session;
}

export async function getMyProfile(deps: Pick<Deps, "agents" | "users">, session: Session | null): Promise<Profile> {
  const current = requireSession(session);
  if (isStaff(current)) {
    const agent = await deps.agents.findById(current.userId);
    if (!agent) throw new NotFoundError("Profil introuvable.");
    return fromAgent(agent);
  }
  const user = await deps.users.findById(current.userId);
  if (!user) throw new NotFoundError("Profil introuvable.");
  return { id: user.id, role: current.role, fullName: user.fullName, email: user.email, phone: user.phone };
}

export function validateProfile(input: ProfileInput, staff: boolean): Record<string, string> {
  const fields: Record<string, string> = {};
  if (input.fullName.trim().length < 2) fields.fullName = "Indiquez votre nom.";
  if (!isValidTunisianPhone(input.phone)) fields.phone = "Numéro invalide (ex. 98 123 456).";
  if (staff) {
    if (!isValidTunisianPhone(input.whatsapp ?? "")) fields.whatsapp = "Numéro WhatsApp invalide.";
    if ((input.jobTitle ?? "").trim().length < 2) fields.jobTitle = "Indiquez votre fonction.";
  }
  return fields;
}

export async function updateMyProfile(deps: Pick<Deps, "agents" | "users" | "auth">, session: Session | null, input: ProfileInput): Promise<Result<Profile>> {
  const current = requireSession(session);
  const staff = isStaff(current);
  const fields = validateProfile(input, staff);
  if (Object.keys(fields).length > 0) return fail("Corrigez les champs signalés.", fields);

  const fullName = input.fullName.trim().replace(/\s+/g, " ");
  const phone = input.phone.trim();

  if (staff) {
    const agent = await deps.agents.findById(current.userId);
    if (!agent) throw new NotFoundError("Profil introuvable.");
    const updated: Agent = {
      ...agent,
      fullName,
      firstName: fullName.split(" ")[0] ?? fullName,
      phone,
      whatsapp: (input.whatsapp ?? "").trim(),
      jobTitle: (input.jobTitle ?? "").trim(),
    };
    await deps.agents.save(updated);
    await deps.auth.rename(current.userId, fullName);
    return ok(fromAgent(updated));
  }

  const user = await deps.users.findById(current.userId);
  if (!user) throw new NotFoundError("Profil introuvable.");
  await deps.users.save({ ...user, fullName, phone });
  await deps.auth.rename(current.userId, fullName);
  return ok({ id: user.id, role: current.role, fullName, email: user.email, phone });
}

export const MIN_PASSWORD_LENGTH = 8;

export interface PasswordChangeInput {
  readonly currentPassword: string;
  readonly newPassword: string;
  readonly confirmPassword: string;
}

export async function changeMyPassword(deps: Pick<Deps, "auth">, session: Session | null, input: PasswordChangeInput): Promise<Result<true>> {
  const current = requireSession(session);
  const fields: Record<string, string> = {};
  if (input.currentPassword.length === 0) fields.currentPassword = "Saisissez votre mot de passe actuel.";
  if (input.newPassword.length < MIN_PASSWORD_LENGTH) fields.newPassword = `${MIN_PASSWORD_LENGTH} caractères minimum.`;
  else if (input.newPassword === input.currentPassword) fields.newPassword = "Choisissez un mot de passe différent de l'actuel.";
  if (input.confirmPassword !== input.newPassword) fields.confirmPassword = "Les deux mots de passe ne correspondent pas.";
  if (Object.keys(fields).length > 0) return fail("Corrigez les champs signalés.", fields);
  return deps.auth.changePassword(current.userId, input.currentPassword, input.newPassword);
}
