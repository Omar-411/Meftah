"use client";

import { useActionState } from "react";
import { createLeadAction } from "@/app/actions/crm";
import { SOURCE_LABELS } from "@/domain/lead/lead";
import { IDLE } from "@/lib/form-state";
import { Field, FormMessage, SelectInput, TextInput, Textarea } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";

export function NewLeadForm({ listingOptions }: { listingOptions: ReadonlyArray<{ id: string; label: string }> }) {
  const [state, action] = useActionState(createLeadAction, IDLE);
  const errors = state.fields ?? {};
  const manualSources = (["phone", "whatsapp", "referral", "portal", "manual"] as const).map((value) => ({ value, label: SOURCE_LABELS[value] }));

  return (
    <form action={action} className="space-y-space-md rounded-xl bg-surface-container-lowest p-space-lg shadow-sm">
      <div className="grid gap-space-md sm:grid-cols-2">
        <Field label="Nom complet" htmlFor="fullName" error={errors.fullName}>
          <TextInput id="fullName" name="fullName" error={errors.fullName} />
        </Field>
        <Field label="Téléphone" htmlFor="phone" error={errors.phone}>
          <TextInput id="phone" name="phone" type="tel" placeholder="98 123 456" error={errors.phone} />
        </Field>
        <Field label="E-mail (facultatif)" htmlFor="email">
          <TextInput id="email" name="email" type="email" />
        </Field>
        <Field label="Source" htmlFor="source">
          <SelectInput id="source" name="source" defaultValue="phone">
            {manualSources.map((source) => (
              <option key={source.value} value={source.value}>{source.label}</option>
            ))}
          </SelectInput>
        </Field>
        <Field label="Recherche" htmlFor="transaction">
          <SelectInput id="transaction" name="transaction" defaultValue="sale">
            <option value="sale">Achat</option>
            <option value="rent">Location</option>
          </SelectInput>
        </Field>
        <Field label="Budget max (TND)" htmlFor="budgetMax">
          <TextInput id="budgetMax" name="budgetMax" inputMode="numeric" />
        </Field>
      </div>
      <Field label="Bien concerné (facultatif)" htmlFor="listingId">
        <SelectInput id="listingId" name="listingId" defaultValue="">
          <option value="">Aucun bien en particulier</option>
          {listingOptions.map((option) => (
            <option key={option.id} value={option.id}>{option.label}</option>
          ))}
        </SelectInput>
      </Field>
      <Field label="Notes" htmlFor="message">
        <Textarea id="message" name="message" rows={3} placeholder="Ce que le prospect a dit, ses contraintes, son délai…" />
      </Field>
      <FormMessage state={state} />
      <SubmitButton icon="person_add" size="lg">Créer le prospect</SubmitButton>
    </form>
  );
}
