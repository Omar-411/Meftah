"use client";

import { useActionState } from "react";
import { scheduleAppointmentAction } from "@/app/actions/crm";
import { REMINDER_OPTIONS } from "@/domain/appointment/appointment";
import { IDLE } from "@/lib/form-state";
import { Field, FormMessage, SelectInput, TextInput } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";

interface Option {
  id: string;
  label: string;
}

interface Props {
  leadOptions: readonly Option[];
  listingOptions: readonly Option[];
  defaultLeadId: string;
  defaultDate: string;
}

export function ScheduleForm({ leadOptions, listingOptions, defaultLeadId, defaultDate }: Props) {
  const [state, action] = useActionState(scheduleAppointmentAction, IDLE);
  const errors = state.fields ?? {};

  return (
    <form action={action} className="grid gap-space-md sm:grid-cols-2">
      <Field label="Prospect" htmlFor="leadId">
        <SelectInput id="leadId" name="leadId" defaultValue={defaultLeadId} required>
          <option value="" disabled>Choisir…</option>
          {leadOptions.map((option) => (
            <option key={option.id} value={option.id}>{option.label}</option>
          ))}
        </SelectInput>
      </Field>
      <Field label="Bien à visiter" htmlFor="listingId" error={errors.listingId}>
        <SelectInput id="listingId" name="listingId" defaultValue="" required>
          <option value="" disabled>Choisir…</option>
          {listingOptions.map((option) => (
            <option key={option.id} value={option.id}>{option.label}</option>
          ))}
        </SelectInput>
      </Field>
      <Field label="Date" htmlFor="date" error={errors.startsAt}>
        <TextInput id="date" name="date" type="date" defaultValue={defaultDate} required error={errors.startsAt} />
      </Field>
      <Field label="Heure" htmlFor="time">
        <TextInput id="time" name="time" type="time" defaultValue="10:00" required />
      </Field>
      <Field label="Durée" htmlFor="durationMin">
        <SelectInput id="durationMin" name="durationMin" defaultValue="45">
          {[30, 45, 60, 90].map((minutes) => (
            <option key={minutes} value={minutes}>{minutes} min</option>
          ))}
        </SelectInput>
      </Field>
      <Field label="Rappel" htmlFor="reminder">
        <SelectInput id="reminder" name="reminder" defaultValue="60">
          {REMINDER_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </SelectInput>
      </Field>
      <Field label="Notes (facultatif)" htmlFor="notes" className="sm:col-span-2">
        <TextInput id="notes" name="notes" placeholder="Digicode, point de rendez-vous…" />
      </Field>
      <div className="space-y-space-sm sm:col-span-2">
        <FormMessage state={state} />
        <SubmitButton icon="event_available">Planifier la visite</SubmitButton>
      </div>
    </form>
  );
}
