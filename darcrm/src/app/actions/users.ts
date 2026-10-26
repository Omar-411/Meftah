"use server";

import { revalidatePath } from "next/cache";
import { changeAccountRole, createStaffAccount, setAccountActive } from "@/application/crm/users";
import type { StaffAccountRole } from "@/domain/account/managed-account";
import { getDeps } from "@/infrastructure/container";
import { readSession } from "@/infrastructure/session";
import { stateFromResult, text, type FormState } from "@/lib/form-state";
import { run } from "./run";

const refresh = () => revalidatePath("/crm/utilisateurs");
const asStaffRole = (value: string): StaffAccountRole => (value === "admin" ? "admin" : "agent");

export async function createStaffAccountAction(_previous: FormState, data: FormData): Promise<FormState> {
  const role = asStaffRole(text(data, "role"));
  const result = await run(async () =>
    createStaffAccount(getDeps(), await readSession(), {
      fullName: text(data, "fullName"),
      email: text(data, "email"),
      phone: text(data, "phone"),
      jobTitle: text(data, "jobTitle"),
      password: text(data, "password"),
      role,
    }),
  );
  if (result.ok) refresh();
  return stateFromResult(result, `Compte ${role === "admin" ? "administrateur" : "agent"} créé : ${text(data, "email").trim().toLowerCase()} peut se connecter.`);
}

export async function changeRoleAction(accountId: string, data: FormData): Promise<FormState> {
  const role = asStaffRole(text(data, "role"));
  const result = await run(async () => changeAccountRole(getDeps(), await readSession(), accountId, role));
  if (result.ok) refresh();
  return stateFromResult(result, role === "admin" ? "Rôle mis à jour : administrateur." : "Rôle mis à jour : agent.");
}

export async function setActiveAction(accountId: string, active: boolean): Promise<FormState> {
  const result = await run(async () => setAccountActive(getDeps(), await readSession(), accountId, active));
  if (result.ok) refresh();
  return stateFromResult(result, active ? "Compte réactivé." : "Compte désactivé : la personne ne peut plus se connecter.");
}
