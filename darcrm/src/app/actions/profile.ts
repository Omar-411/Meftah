"use server";

import { revalidatePath } from "next/cache";
import { changeMyPassword, updateMyProfile } from "@/application/account/profile";
import { getDeps } from "@/infrastructure/container";
import { readSession, writeSession } from "@/infrastructure/session";
import { stateFromResult, text, type FormState } from "@/lib/form-state";
import { run } from "./run";

export async function updateProfileAction(_previous: FormState, data: FormData): Promise<FormState> {
  const session = await readSession();
  const result = await run(() =>
    updateMyProfile(getDeps(), session, {
      fullName: text(data, "fullName"),
      phone: text(data, "phone"),
      whatsapp: data.has("whatsapp") ? text(data, "whatsapp") : undefined,
      jobTitle: data.has("jobTitle") ? text(data, "jobTitle") : undefined,
    }),
  );
  if (result.ok && session) {
    // The header and sidebar read the name from the session cookie.
    await writeSession({ ...session, displayName: result.value.fullName });
    revalidatePath("/", "layout");
  }
  return stateFromResult(result, "Profil mis à jour.");
}

export async function changePasswordAction(_previous: FormState, data: FormData): Promise<FormState> {
  const session = await readSession();
  const result = await run(() =>
    changeMyPassword(getDeps(), session, {
      currentPassword: text(data, "currentPassword"),
      newPassword: text(data, "newPassword"),
      confirmPassword: text(data, "confirmPassword"),
    }),
  );
  return stateFromResult(result, "Mot de passe modifié.");
}
