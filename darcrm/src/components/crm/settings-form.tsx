"use client";

import { useActionState } from "react";
import { saveSettingsAction } from "@/app/actions/crm";
import type { AgencySettings } from "@/domain/agency/agency";
import { IDLE } from "@/lib/form-state";
import { Field, FormMessage, SectionCard, TextInput } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";

export function SettingsForm({ agency }: { agency: AgencySettings }) {
  const [state, action] = useActionState(saveSettingsAction, IDLE);
  const errors = state.fields ?? {};

  return (
    <form action={action} className="max-w-3xl space-y-space-lg">
      <SectionCard icon="storefront" title="Agence" subtitle="Affiché dans l'en-tête, le pied de page et les fiches du site public.">
        <div className="grid gap-space-md sm:grid-cols-2">
          <Field label="Nom" htmlFor="name" error={errors.name}>
            <TextInput id="name" name="name" defaultValue={agency.name} error={errors.name} />
          </Field>
          <Field label="Slogan" htmlFor="tagline">
            <TextInput id="tagline" name="tagline" defaultValue={agency.tagline} />
          </Field>
          <Field label="Téléphone" htmlFor="phone" error={errors.phone}>
            <TextInput id="phone" name="phone" type="tel" defaultValue={agency.phone} error={errors.phone} />
          </Field>
          <Field label="WhatsApp" htmlFor="whatsapp" error={errors.whatsapp}>
            <TextInput id="whatsapp" name="whatsapp" type="tel" defaultValue={agency.whatsapp} error={errors.whatsapp} />
          </Field>
          <Field label="E-mail" htmlFor="email" error={errors.email}>
            <TextInput id="email" name="email" type="email" defaultValue={agency.email} error={errors.email} />
          </Field>
          <Field label="Adresse" htmlFor="address">
            <TextInput id="address" name="address" defaultValue={agency.address} />
          </Field>
        </div>
      </SectionCard>

      <SectionCard icon="notifications_active" title="Alertes WhatsApp" subtitle="Envoyées aux visiteurs dont une recherche enregistrée correspond à un nouveau bien publié.">
        <label className="flex items-center gap-2 font-body-md text-body-md text-on-surface">
          <input type="checkbox" name="whatsappAlertsEnabled" defaultChecked={agency.whatsappAlertsEnabled} className="h-4 w-4 accent-primary-container" />
          Activer les alertes pour les visiteurs
        </label>
      </SectionCard>

      <SectionCard icon="alarm" title="Rappels de visite automatiques" subtitle="Un message WhatsApp part tout seul vers le prospect la veille et 1 heure avant chaque visite planifiée.">
        <label className="flex items-center gap-2 font-body-md text-body-md text-on-surface">
          <input type="checkbox" name="visitRemindersEnabled" defaultChecked={agency.visitRemindersEnabled === true} className="h-4 w-4 accent-primary-container" />
          Envoyer les rappels de visite aux prospects
        </label>
        <p className="mt-space-sm font-label-sm text-label-sm text-on-surface-variant">Les textes se modifient plus bas. Sans connexion WhatsApp Business configurée sur le serveur, les messages sont seulement inscrits dans le journal du serveur.</p>
      </SectionCard>

      <FormMessage state={state} />
      <SubmitButton icon="save" size="lg">Enregistrer les paramètres</SubmitButton>
    </form>
  );
}
