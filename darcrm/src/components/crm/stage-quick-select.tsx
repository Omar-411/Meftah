"use client";

import { ActionForm } from "@/components/ui/action-form";
import { useRef } from "react";
import { quickMoveLeadAction } from "@/app/actions/crm";
import { LEAD_STAGES, STAGE_LABELS, type LeadStage } from "@/domain/lead/lead";

/** Closing or losing a lead needs extra details, so those stages are set from the lead page instead. */
const QUICK_STAGES = LEAD_STAGES.filter((stage) => stage !== "closed" && stage !== "lost");

export function StageQuickSelect({ leadId, stage }: { leadId: string; stage: LeadStage }) {
  const formRef = useRef<HTMLFormElement>(null);
  return (
    <ActionForm ref={formRef} action={quickMoveLeadAction.bind(null, leadId)}>
      <select
        name="stage"
        defaultValue={stage}
        aria-label="Changer l'étape"
        onChange={() => formRef.current?.requestSubmit()}
        className="h-8 w-full cursor-pointer rounded-md border border-outline-variant bg-surface-container-lowest px-2 font-label-sm text-label-sm text-on-surface"
      >
        {QUICK_STAGES.map((value) => (
          <option key={value} value={value}>{STAGE_LABELS[value]}</option>
        ))}
      </select>
    </ActionForm>
  );
}
