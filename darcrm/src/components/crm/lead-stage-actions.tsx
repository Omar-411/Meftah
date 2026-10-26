"use client";

import { useActionState, useState } from "react";
import { moveLeadStageAction } from "@/app/actions/crm";
import { commissionOf } from "@/domain/deal/deal";
import { formatAmount } from "@/domain/shared/format";
import { isOpenStage, type LeadStage } from "@/domain/lead/lead";
import { IDLE } from "@/lib/form-state";
import { Button } from "@/components/ui/button";
import { Field, FormMessage, SelectInput, TextInput, UnitInput } from "@/components/ui/form";
import { Icon } from "@/components/ui/icon";
import { SubmitButton } from "@/components/ui/submit-button";
import { StageQuickSelect } from "./stage-quick-select";

interface Props {
  leadId: string;
  stage: LeadStage;
  listingOptions: ReadonlyArray<{ id: string; label: string; price: number }>;
  defaultListingId: string | null;
  defaultCommissionRate: number;
}

type Panel = "close" | "lost" | null;

export function LeadStageActions({ leadId, stage, listingOptions, defaultListingId, defaultCommissionRate }: Props) {
  const [panel, setPanel] = useState<Panel>(null);
  if (!isOpenStage(stage)) return null;

  const toggle = (next: Exclude<Panel, null>) => setPanel((current) => (current === next ? null : next));

  return (
    <div className="space-y-space-md">
      <div className="flex flex-wrap items-center gap-space-sm">
        <div className="w-44">
          <StageQuickSelect leadId={leadId} stage={stage} />
        </div>
        <Button size="sm" variant={panel === "close" ? "primary" : "secondary"} onClick={() => toggle("close")}>
          <Icon name="verified" className="text-[18px]" />
          Conclure la vente
        </Button>
        <Button size="sm" variant={panel === "lost" ? "danger" : "ghost"} onClick={() => toggle("lost")}>
          <Icon name="block" className="text-[18px]" />
          Marquer perdu
        </Button>
      </div>

      {panel === "close" && <CloseDealForm leadId={leadId} listingOptions={listingOptions} defaultListingId={defaultListingId} defaultCommissionRate={defaultCommissionRate} />}
      {panel === "lost" && <LostForm leadId={leadId} />}
    </div>
  );
}

function CloseDealForm({ leadId, listingOptions, defaultListingId, defaultCommissionRate }: Omit<Props, "stage">) {
  const [state, action] = useActionState(moveLeadStageAction.bind(null, leadId, "closed"), IDLE);
  const [listingId, setListingId] = useState(defaultListingId ?? listingOptions[0]?.id ?? "");
  const [amount, setAmount] = useState(listingOptions.find((option) => option.id === listingId)?.price ?? 0);
  const [rate, setRate] = useState(defaultCommissionRate);
  const errors = state.fields ?? {};

  const pickListing = (id: string) => {
    setListingId(id);
    const price = listingOptions.find((option) => option.id === id)?.price;
    if (price) setAmount(price);
  };

  return (
    <form action={action} className="space-y-space-md rounded-xl bg-surface-container-low p-space-md">
      <input type="hidden" name="listingId" value={listingId} />
      <input type="hidden" name="amount" value={amount} />
      <input type="hidden" name="commissionRate" value={rate} />
      <div className="grid gap-space-md sm:grid-cols-2">
        <Field label="Bien vendu / loué" htmlFor="deal-listing">
          <SelectInput id="deal-listing" value={listingId} onChange={(event) => pickListing(event.target.value)}>
            {listingOptions.map((option) => (
              <option key={option.id} value={option.id}>{option.label}</option>
            ))}
          </SelectInput>
        </Field>
        <Field label="Montant conclu" htmlFor="deal-amount" error={errors.amount}>
          <UnitInput id="deal-amount" unit="TND" unitWidthClass="pr-14" value={amount} onChange={setAmount} error={errors.amount} />
        </Field>
        <Field label="Commission (%)" htmlFor="deal-rate" hint={amount > 0 ? `≈ ${formatAmount(commissionOf({ amount, commissionRate: rate }))} TND` : undefined}>
          <TextInput id="deal-rate" inputMode="decimal" value={String(rate)} onChange={(event) => setRate(Number(event.target.value.replace(",", ".")) || 0)} />
        </Field>
      </div>
      <p className="font-body-sm text-body-sm text-on-surface-variant">Le bien sera retiré du site public.</p>
      <FormMessage state={state} />
      <SubmitButton icon="verified">Confirmer la vente</SubmitButton>
    </form>
  );
}

function LostForm({ leadId }: { leadId: string }) {
  const [state, action] = useActionState(moveLeadStageAction.bind(null, leadId, "lost"), IDLE);
  return (
    <form action={action} className="space-y-space-md rounded-xl bg-surface-container-low p-space-md">
      <Field label="Motif" htmlFor="lostReason" error={state.fields?.lostReason}>
        <TextInput id="lostReason" name="lostReason" placeholder="Ex. a acheté ailleurs, budget insuffisant…" error={state.fields?.lostReason} />
      </Field>
      <FormMessage state={state} />
      <SubmitButton variant="danger" icon="block">Marquer comme perdu</SubmitButton>
    </form>
  );
}
