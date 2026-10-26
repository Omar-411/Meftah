import type { ManagedAccount, NewStaffAccount, StaffAccountRole } from "@/domain/account/managed-account";
import { MIN_PASSWORD_LENGTH } from "@/domain/account/managed-account";
import type { Session } from "@/domain/auth/session";
import { isValidEmail, isValidTunisianPhone } from "@/domain/shared/format";
import { fail, ok, type Result } from "@/domain/shared/result";
import { NotFoundError } from "../errors";
import { requireAdmin } from "../guards";
import type { Deps } from "../ports";

type DirectoryDeps = Pick<Deps, "directory">;

export async function listAccounts(deps: DirectoryDeps, session: Session | null): Promise<ManagedAccount[]> {
  requireAdmin(session);
  const accounts = await deps.directory.list();
  return [...accounts].sort((a, b) => a.fullName.localeCompare(b.fullName, "fr"));
}

export async function createStaffAccount(deps: DirectoryDeps, session: Session | null, input: NewStaffAccount): Promise<Result<ManagedAccount>> {
  requireAdmin(session);
  const fields: Record<string, string> = {};
  if (input.fullName.trim().length < 2) fields.fullName = "Indiquez le nom complet.";
  if (!isValidEmail(input.email)) fields.email = "Adresse e-mail invalide.";
  if (!isValidTunisianPhone(input.phone)) fields.phone = "Numéro invalide (ex. 98 123 456).";
  if (input.password.length < MIN_PASSWORD_LENGTH) fields.password = `${MIN_PASSWORD_LENGTH} caractères minimum.`;
  if (Object.keys(fields).length > 0) return fail("Vérifiez les champs signalés.", fields);
  return deps.directory.createStaff({ ...input, fullName: input.fullName.trim(), email: input.email.trim().toLowerCase(), jobTitle: input.jobTitle.trim() || (input.role === "admin" ? "Administrateur" : "Conseiller immobilier") });
}

export async function changeAccountRole(deps: DirectoryDeps, session: Session | null, accountId: string, role: StaffAccountRole): Promise<Result<true>> {
  const admin = requireAdmin(session);
  const account = await deps.directory.find(accountId);
  if (!account) throw new NotFoundError("Compte introuvable.");
  if (account.role === "user") return fail("Les comptes visiteurs ne peuvent pas devenir agents. Créez un compte agent.");
  if (account.id === admin.userId && role !== "admin") return fail("Vous ne pouvez pas retirer votre propre rôle d'administrateur.");
  if (account.role === role) return ok(true);
  if (account.role === "admin" && (await isLastActiveAdmin(deps, account.id))) return fail("Il doit rester au moins un administrateur actif.");
  await deps.directory.setRole(account.id, role);
  return ok(true);
}

export async function setAccountActive(deps: DirectoryDeps, session: Session | null, accountId: string, active: boolean): Promise<Result<true>> {
  const admin = requireAdmin(session);
  const account = await deps.directory.find(accountId);
  if (!account) throw new NotFoundError("Compte introuvable.");
  if (account.active === active) return ok(true);
  if (!active && account.id === admin.userId) return fail("Vous ne pouvez pas désactiver votre propre compte.");
  if (!active && account.role === "admin" && (await isLastActiveAdmin(deps, account.id))) return fail("Il doit rester au moins un administrateur actif.");
  await deps.directory.setActive(account.id, active);
  return ok(true);
}

async function isLastActiveAdmin(deps: DirectoryDeps, accountId: string): Promise<boolean> {
  const others = (await deps.directory.list()).filter((account) => account.role === "admin" && account.active && account.id !== accountId);
  return others.length === 0;
}
