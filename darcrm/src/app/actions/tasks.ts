"use server";

import { revalidatePath } from "next/cache";
import { createTask, setTaskDone } from "@/application/crm/tasks";
import { ok } from "@/domain/shared/result";
import { getDeps } from "@/infrastructure/container";
import { readSession } from "@/infrastructure/session";
import { stateFromResult, text, type FormState } from "@/lib/form-state";
import { run } from "./run";

const refresh = () => revalidatePath("/crm", "layout");

export async function createTaskAction(_previous: FormState, data: FormData): Promise<FormState> {
  const leadId = text(data, "leadId");
  const result = await run(async () =>
    createTask(getDeps(), await readSession(), { leadId: leadId || null, title: text(data, "title"), dueDate: text(data, "dueDate") }, new Date()),
  );
  if (result.ok) refresh();
  return stateFromResult(result, "Tâche ajoutée.");
}

export async function setTaskDoneAction(taskId: string, done: boolean): Promise<FormState> {
  const result = await run(async () => {
    await setTaskDone(getDeps(), await readSession(), taskId, done, new Date());
    return ok(true);
  });
  if (result.ok) refresh();
  return stateFromResult(result, done ? "Tâche terminée." : "Tâche rouverte.");
}
