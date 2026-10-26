"use client";

import Link from "next/link";
import { useTransition } from "react";
import { setTaskDoneAction } from "@/app/actions/tasks";
import { formatShortDateFr, parseDateKey } from "@/domain/shared/format";
import { isOverdue, type Task } from "@/domain/task/task";
import { announce } from "@/lib/toast";
import { cn } from "@/lib/cn";
import { Icon } from "@/components/ui/icon";

interface Props {
  task: Task;
  todayKey: string;
  /** Shown as a link to the lead; omit on the lead's own page. */
  lead?: { id: string; fullName: string } | null;
  showDate?: boolean;
}

export function TaskRow({ task, todayKey, lead, showDate = false }: Props) {
  const [pending, startTransition] = useTransition();
  const done = task.doneAt !== null;
  const late = isOverdue(task, todayKey);
  const toggle = () => startTransition(async () => announce(await setTaskDoneAction(task.id, !done)));
  const dueLabel = showDate || late ? formatShortDateFr(parseDateKey(task.dueDate) ?? new Date()) : null;

  return (
    <li className="flex items-start gap-space-sm py-space-sm">
      <button
        type="button"
        role="checkbox"
        aria-checked={done}
        aria-label={done ? `Rouvrir : ${task.title}` : `Terminer : ${task.title}`}
        disabled={pending}
        onClick={toggle}
        className={cn(
          "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
          done ? "border-secondary bg-secondary text-on-secondary" : late ? "border-error text-transparent hover:bg-error-container" : "border-outline text-transparent hover:border-primary hover:bg-surface-container-high hover:text-primary",
        )}
      >
        <Icon name="check" className="text-[16px]" />
      </button>
      <div className="min-w-0 flex-1">
        <p className={cn("font-body-md text-body-md", done ? "text-on-surface-variant line-through" : "text-on-surface")}>{task.title}</p>
        <p className="flex flex-wrap items-center gap-x-3 font-label-sm text-label-sm text-on-surface-variant">
          {lead && (
            <Link href={`/crm/prospects/${lead.id}`} className="inline-flex items-center gap-1 text-primary hover:underline">
              <Icon name="person" className="text-[14px]" />
              {lead.fullName}
            </Link>
          )}
          {dueLabel && <span className={cn(late && !done && "font-semibold text-error")}>{late && !done ? `En retard · ${dueLabel}` : dueLabel}</span>}
        </p>
      </div>
    </li>
  );
}
