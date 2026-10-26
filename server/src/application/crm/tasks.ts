import { scopeOf, type Session } from "../../domain/auth/session";
import { newId } from "../../domain/shared/id";
import { fail, ok, type Result } from "../../domain/shared/result";
import { validateNewTask, type NewTask, type Task } from "../../domain/task/task";
import { NotFoundError } from "../errors";
import { assertCanAccess, requireStaff } from "../guards";
import type { Deps, TaskQuery } from "../ports";

export async function listTasks(deps: Pick<Deps, "tasks">, session: Session | null, query: TaskQuery): Promise<Task[]> {
  return deps.tasks.list(scopeOf(requireStaff(session)), query);
}

/** A task about a lead belongs to the lead's agent, so an admin planning a follow-up puts it on the right person's list. */
export async function createTask(deps: Pick<Deps, "tasks" | "leads">, session: Session | null, input: NewTask, now: Date): Promise<Result<Task>> {
  const staff = requireStaff(session);
  const errors = validateNewTask(input);
  if (Object.keys(errors).length > 0) return fail("Vérifiez les champs signalés.", errors);

  let agentId = staff.userId;
  if (input.leadId) {
    const lead = await deps.leads.findById(input.leadId);
    if (!lead) throw new NotFoundError("Prospect introuvable.");
    assertCanAccess(scopeOf(staff), lead.agentId);
    agentId = lead.agentId;
  }
  const task: Task = { id: newId("task"), agentId, leadId: input.leadId, title: input.title.trim(), dueDate: input.dueDate, doneAt: null, createdAt: now.toISOString() };
  return ok(await deps.tasks.create(task));
}

export async function setTaskDone(deps: Pick<Deps, "tasks">, session: Session | null, id: string, done: boolean, now: Date): Promise<Task> {
  const staff = requireStaff(session);
  const task = await deps.tasks.findById(id);
  if (!task) throw new NotFoundError("Tâche introuvable.");
  assertCanAccess(scopeOf(staff), task.agentId);
  const updated: Task = { ...task, doneAt: done ? now.toISOString() : null };
  await deps.tasks.save(updated);
  return updated;
}
