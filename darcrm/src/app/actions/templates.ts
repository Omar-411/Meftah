"use server";

import { revalidatePath } from "next/cache";
import { logMessageSent, resetTemplate, saveTemplate } from "@/application/crm/templates";
import { ok } from "@/domain/shared/result";
import { getDeps } from "@/infrastructure/container";
import { readSession } from "@/infrastructure/session";
import { stateFromResult, text, type FormState } from "@/lib/form-state";
import { run } from "./run";

const refresh = () => revalidatePath("/crm/parametres");

export async function saveTemplateAction(key: string, _previous: FormState, data: FormData): Promise<FormState> {
  const result = await run(async () => saveTemplate(getDeps(), await readSession(), key, text(data, "body")));
  if (result.ok) refresh();
  return stateFromResult(result, "Modèle enregistré.");
}

export async function resetTemplateAction(key: string): Promise<FormState> {
  const result = await run(async () => {
    await resetTemplate(getDeps(), await readSession(), key);
    return ok(true);
  });
  if (result.ok) refresh();
  return stateFromResult(result, "Texte d'origine rétabli.");
}

export async function logMessageSentAction(leadId: string, label: string): Promise<FormState> {
  const result = await run(async () => logMessageSent(getDeps(), await readSession(), leadId, label, new Date()));
  if (result.ok) revalidatePath(`/crm/prospects/${leadId}`);
  return stateFromResult(result, "Message ajouté au journal du prospect.");
}
