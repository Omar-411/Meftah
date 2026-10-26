"use client";

import { useActionState } from "react";
import { updateCriteriaAction } from "@/app/actions/crm";
import { PROPERTY_TYPE_LABELS, ROOMS_OPTIONS, roomsLabel } from "@/domain/listing/catalog";
import type { SearchCriteria } from "@/domain/lead/lead";
import { CITIES } from "@/domain/shared/locations";
import { IDLE } from "@/lib/form-state";
import { Field, FormMessage, SelectInput, TextInput } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";

const CheckGroup = ({ name, legend, options, selected }: { name: string; legend: string; options: ReadonlyArray<{ value: string; label: string }>; selected: readonly string[] }) => (
  <fieldset>
    <legend className="mb-1 font-label-md text-label-md text-on-surface">{legend}</legend>
    <div className="flex flex-wrap gap-x-space-md gap-y-1">
      {options.map((option) => (
        <label key={option.value} className="flex items-center gap-1.5 font-body-md text-body-md text-on-surface">
          <input type="checkbox" name={name} value={option.value} defaultChecked={selected.includes(option.value)} className="h-4 w-4 accent-primary-container" />
          {option.label}
        </label>
      ))}
    </div>
  </fieldset>
);

/** What the prospect is looking for. Drives the matching suggestions below. */
export function LeadCriteriaForm({ leadId, criteria }: { leadId: string; criteria: SearchCriteria }) {
  const [state, action] = useActionState(updateCriteriaAction.bind(null, leadId), IDLE);
  return (
    <form action={action} className="space-y-space-md">
      <Field label="Recherche" htmlFor="criteria-transaction">
        <SelectInput id="criteria-transaction" name="transaction" defaultValue={criteria.transaction}>
          <option value="sale">Achat</option>
          <option value="rent">Location</option>
        </SelectInput>
      </Field>
      <CheckGroup name="propertyTypes" legend="Types de bien" selected={criteria.propertyTypes} options={Object.entries(PROPERTY_TYPE_LABELS).map(([value, label]) => ({ value, label }))} />
      <CheckGroup name="cityIds" legend="Villes" selected={criteria.cityIds} options={CITIES.map((city) => ({ value: city.id, label: city.label }))} />
      <div className="grid gap-space-md sm:grid-cols-2">
        <Field label="Budget min (TND)" htmlFor="budgetMin">
          <TextInput id="budgetMin" name="budgetMin" inputMode="numeric" defaultValue={criteria.budgetMin ?? ""} />
        </Field>
        <Field label="Budget max (TND)" htmlFor="budgetMax">
          <TextInput id="budgetMax" name="budgetMax" inputMode="numeric" defaultValue={criteria.budgetMax ?? ""} />
        </Field>
        <Field label="Pièces min." htmlFor="minRooms">
          <SelectInput id="minRooms" name="minRooms" defaultValue={criteria.minRooms ?? ""}>
            <option value="">Indifférent</option>
            {ROOMS_OPTIONS.map((rooms) => (
              <option key={rooms} value={rooms}>{roomsLabel(rooms)} et +</option>
            ))}
          </SelectInput>
        </Field>
        <Field label="Surface min. (m²)" htmlFor="minArea">
          <TextInput id="minArea" name="minArea" inputMode="numeric" defaultValue={criteria.minArea ?? ""} />
        </Field>
      </div>
      <FormMessage state={state} />
      <SubmitButton variant="secondary" icon="save">Enregistrer les critères</SubmitButton>
    </form>
  );
}
