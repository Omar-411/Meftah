"use client";

import { useActionState, useState } from "react";
import { createTaskAction } from "@/app/actions/tasks";
import { addDays, parseDateKey, toDateKey } from "@/domain/shared/format";
import { IDLE } from "@/lib/form-state";
import { cn } from "@/lib/cn";
import { Field, FormMessage, SelectInput, TextInput } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";

interface Props {
  /** Server-provided "today" so the presets never differ between server and browser rendering. */
  todayKey: string;
  /** Fixed lead (lead page) or a choice among these options (Today page). */
  leadId?: string;
  leadOptions?: ReadonlyArray<{ id: string; label: string }>;
}

const PRESETS = [
  { label: "Aujourd'hui", days: 0 },
  { label: "Demain", days: 1 },
  { label: "Dans 3 jours", days: 3 },
  { label: "Dans 1 semaine", days: 7 },
] as const;

export function TaskForm({ todayKey, leadId, leadOptions }: Props) {
  const [state, action] = useActionState(createTaskAction, IDLE);
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState(todayKey);
  const [seen, setSeen] = useState(state);
  if (seen !== state) {
    setSeen(state);
    if (state.status === "success") setTitle("");
  }
  const errors = state.fields ?? {};
  const today = parseDateKey(todayKey) ?? new Date();

  return (
    <form action={action} noValidate className="space-y-space-sm">
      <div className="grid gap-space-sm sm:grid-cols-[1fr_auto]">
        <Field label="Quoi faire ?" htmlFor="task-title" error={errors.title}>
          <TextInput id="task-title" name="title" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Rappeler après la visite" maxLength={140} error={errors.title} />
        </Field>
        {leadOptions && (
          <Field label="Prospect" htmlFor="task-lead" error={errors.leadId}>
            <SelectInput id="task-lead" name="leadId" defaultValue="">
              <option value="">Aucun prospect</option>
              {leadOptions.map((option) => (
                <option key={option.id} value={option.id}>{option.label}</option>
              ))}
            </SelectInput>
          </Field>
        )}
      </div>
      {leadId && <input type="hidden" name="leadId" value={leadId} />}
      <input type="hidden" name="dueDate" value={dueDate} />
      <div className="flex flex-wrap items-center gap-space-xs" role="group" aria-label="Échéance">
        {PRESETS.map((preset) => {
          const key = toDateKey(addDays(today, preset.days));
          return (
            <button
              key={preset.label}
              type="button"
              aria-pressed={dueDate === key}
              onClick={() => setDueDate(key)}
              className={cn(
                "rounded-full px-3 py-1 font-label-md text-label-md transition-colors",
                dueDate === key ? "bg-primary text-on-primary" : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high",
              )}
            >
              {preset.label}
            </button>
          );
        })}
        <input
          type="date"
          aria-label="Choisir une date"
          value={dueDate}
          min={todayKey}
          onChange={(event) => event.target.value && setDueDate(event.target.value)}
          className="h-8 rounded-md border border-outline-variant bg-surface-container-lowest px-2 font-label-md text-label-md text-on-surface"
        />
      </div>
      {errors.dueDate && <p role="alert" className="font-label-sm text-label-sm text-error">{errors.dueDate}</p>}
      <FormMessage state={state} />
      <SubmitButton icon="add_task" size="sm">Ajouter la tâche</SubmitButton>
    </form>
  );
}
