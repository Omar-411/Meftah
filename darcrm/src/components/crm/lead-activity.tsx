"use client";

import { useActionState, useRef, useEffect } from "react";
import { logActivityAction } from "@/app/actions/crm";
import { ACTIVITY_ICONS, ACTIVITY_LABELS, LOGGABLE_ACTIVITIES, type Activity } from "@/domain/lead/lead";
import { formatRelativeFr } from "@/domain/shared/format";
import { IDLE } from "@/lib/form-state";
import { FormMessage, SelectInput, Textarea } from "@/components/ui/form";
import { Icon } from "@/components/ui/icon";
import { SubmitButton } from "@/components/ui/submit-button";

export function LeadActivity({ leadId, activities, nowIso }: { leadId: string; activities: readonly Activity[]; nowIso: string }) {
  const [state, action] = useActionState(logActivityAction.bind(null, leadId), IDLE);
  const formRef = useRef<HTMLFormElement>(null);
  const now = new Date(nowIso);

  useEffect(() => {
    if (state.status === "success") formRef.current?.reset();
  }, [state]);

  return (
    <div className="space-y-space-lg">
      <form ref={formRef} action={action} className="space-y-space-sm">
        <div className="grid gap-space-sm sm:grid-cols-[180px_1fr]">
          <SelectInput name="kind" aria-label="Type d'échange" defaultValue="call">
            {LOGGABLE_ACTIVITIES.map((kind) => (
              <option key={kind} value={kind}>{ACTIVITY_LABELS[kind]}</option>
            ))}
          </SelectInput>
          <Textarea name="summary" rows={2} placeholder="Résumé de l'échange (ex. rappelé, souhaite visiter samedi)" aria-label="Résumé" error={state.fields?.summary} />
        </div>
        <FormMessage state={state} />
        <SubmitButton variant="secondary" size="sm" icon="add">Ajouter au journal</SubmitButton>
      </form>

      {activities.length === 0 ? (
        <p className="font-body-md text-body-md text-on-surface-variant">Aucun échange enregistré pour le moment.</p>
      ) : (
        <ol className="relative space-y-space-md border-l border-outline-variant/60 pl-space-md">
          {activities.map((activity) => (
            <li key={activity.id} className="relative">
              <span className="absolute -left-[calc(theme(spacing.space-md)+13px)] top-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-surface-container-high text-primary">
                <Icon name={ACTIVITY_ICONS[activity.kind]} className="text-[14px]" />
              </span>
              <p className="font-label-md text-label-md font-semibold text-on-surface">
                {ACTIVITY_LABELS[activity.kind]}
                <span className="ml-2 font-label-sm text-label-sm font-normal text-outline">
                  {formatRelativeFr(new Date(activity.at), now)} · {activity.authorName}
                </span>
              </p>
              <p className="font-body-md text-body-md text-on-surface-variant">{activity.summary}</p>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
