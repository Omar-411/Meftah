"use client";

import Link from "next/link";
import { ActionForm } from "@/components/ui/action-form";
import { useActionState } from "react";
import { deleteSearchAction, updateAlertAction } from "@/app/actions/public";
import type { SavedSearch } from "@/domain/account/account";
import { searchHref } from "@/domain/listing/filters";
import { IDLE } from "@/lib/form-state";
import { Button } from "@/components/ui/button";
import { Field, FormMessage, TextInput } from "@/components/ui/form";
import { Icon } from "@/components/ui/icon";
import { SubmitButton } from "@/components/ui/submit-button";

export function SavedSearchCard({ search, alertsEnabled }: { search: SavedSearch; alertsEnabled: boolean }) {
  const [state, action] = useActionState(updateAlertAction.bind(null, search.id), IDLE);

  return (
    <li className="rounded-xl bg-surface-container-lowest p-space-md shadow-sm">
      <div className="flex items-start justify-between gap-space-sm">
        <Link href={searchHref(search.filters)} className="font-headline-sm text-headline-sm text-primary hover:underline">
          {search.name}
        </Link>
        <ActionForm action={deleteSearchAction.bind(null, search.id)}>
          <Button type="submit" variant="ghost" size="sm" aria-label={`Supprimer la recherche ${search.name}`}>
            <Icon name="delete" className="text-[18px]" />
          </Button>
        </ActionForm>
      </div>

      {alertsEnabled ? (
        <form action={action} className="mt-space-md space-y-space-sm">
          <label className="flex items-center gap-2 font-body-md text-body-md text-on-surface">
            <input type="checkbox" name="whatsappAlerts" defaultChecked={search.whatsappAlerts} className="h-4 w-4 accent-secondary" />
            Alertes WhatsApp pour les nouveaux biens
          </label>
          <Field label="Numéro WhatsApp" htmlFor={`phone-${search.id}`} error={state.fields?.whatsappPhone}>
            <TextInput id={`phone-${search.id}`} name="whatsappPhone" type="tel" defaultValue={search.whatsappPhone} error={state.fields?.whatsappPhone} />
          </Field>
          <FormMessage state={state} />
          <SubmitButton variant="secondary" size="sm">
            Mettre à jour
          </SubmitButton>
        </form>
      ) : (
        <p className="mt-space-sm font-body-sm text-body-sm text-on-surface-variant">Les alertes WhatsApp sont désactivées par l'agence.</p>
      )}
    </li>
  );
}
