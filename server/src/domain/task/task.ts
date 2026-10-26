/** A follow-up an agent owes: always has an owner and a calendar day, optionally tied to a lead. Dates are `yyyy-mm-dd` keys so no timezone can shift them. */
export interface Task {
  readonly id: string;
  readonly agentId: string;
  readonly leadId: string | null;
  readonly title: string;
  readonly dueDate: string;
  readonly doneAt: string | null;
  readonly createdAt: string;
}

export interface NewTask {
  readonly leadId: string | null;
  readonly title: string;
  readonly dueDate: string;
}

export const MAX_TASK_TITLE = 140;
const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;

export const isDateKey = (value: string): boolean => DATE_KEY.test(value) && !Number.isNaN(new Date(`${value}T00:00:00Z`).getTime());

export const isOpenTask = (task: Task): boolean => task.doneAt === null;
export const isOverdue = (task: Task, todayKey: string): boolean => isOpenTask(task) && task.dueDate < todayKey;
export const isDueOn = (task: Task, dayKey: string): boolean => isOpenTask(task) && task.dueDate === dayKey;

export function validateNewTask(input: NewTask): Record<string, string> {
  const errors: Record<string, string> = {};
  const title = input.title.trim();
  if (title.length < 2) errors.title = "Décrivez la tâche (ex. Rappeler après la visite).";
  else if (title.length > MAX_TASK_TITLE) errors.title = `${MAX_TASK_TITLE} caractères maximum.`;
  if (!isDateKey(input.dueDate)) errors.dueDate = "Choisissez une date.";
  return errors;
}
