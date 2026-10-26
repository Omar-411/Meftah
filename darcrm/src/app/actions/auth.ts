"use server";

import { redirect } from "next/navigation";
import { login, register } from "@/application/auth/auth";
import { isStaff } from "@/domain/auth/session";
import { getDeps } from "@/infrastructure/container";
import { setFlash } from "@/infrastructure/flash";
import { clearSession, writeSession } from "@/infrastructure/session";
import { stateFromResult, text, type FormState } from "@/lib/form-state";
import { run } from "./run";

/** Only same-site relative paths are allowed, to avoid open redirects. */
function safeNext(raw: string): string | null {
  return raw.startsWith("/") && !raw.startsWith("//") ? raw : null;
}

export async function loginAction(_previous: FormState, data: FormData): Promise<FormState> {
  const result = await run(() => login(getDeps(), text(data, "email"), text(data, "password")));
  if (!result.ok) return stateFromResult(result, "");

  await writeSession(result.value);
  await setFlash("success", `Bienvenue ${result.value.displayName.split(" ")[0]} !`);
  redirect(result.value.role === "agent" ? "/crm/aujourdhui" : isStaff(result.value) ? "/crm" : (safeNext(text(data, "next")) ?? "/compte"));
}

export async function registerAction(_previous: FormState, data: FormData): Promise<FormState> {
  const result = await run(() =>
    register(getDeps(), {
      fullName: text(data, "fullName"),
      email: text(data, "email"),
      phone: text(data, "phone"),
      password: text(data, "password"),
    }),
  );
  if (!result.ok) return stateFromResult(result, "");

  await writeSession(result.value);
  await setFlash("success", "Compte créé. Bienvenue !");
  redirect(safeNext(text(data, "next")) ?? "/compte");
}

export async function logoutAction(): Promise<void> {
  await clearSession();
  await setFlash("info", "Vous êtes déconnecté.");
  redirect("/");
}
