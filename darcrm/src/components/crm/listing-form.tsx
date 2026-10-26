"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { deleteListingAction, saveListingAction } from "@/app/actions/crm";
import { statusLabel, type ListingStatus, type Visibility } from "@/domain/listing/catalog";
import { completenessPercent, isPubliclyVisible, toPublicListing, type Listing } from "@/domain/listing/listing";
import { IDLE } from "@/lib/form-state";
import { ListingCard } from "@/components/public/listing-card";
import { Button } from "@/components/ui/button";
import { Field, FormMessage, Segmented, SectionCard, SelectInput } from "@/components/ui/form";
import { Icon } from "@/components/ui/icon";
import { SubmitButton } from "@/components/ui/submit-button";
import {
  AmenitiesSection,
  BasicsSection,
  FeaturesSection,
  InternalSection,
  PhotosSection,
  PriceLocationSection,
  type SectionProps,
} from "./listing-form-sections";

interface ListingFormProps {
  initial: Listing;
  /** Only passed for admins, who may reassign a listing to another agent. */
  agentOptions: ReadonlyArray<{ id: string; label: string }>;
}

const VISIBILITY_OPTIONS: ReadonlyArray<{ value: Visibility; label: string; dotClassName: string }> = [
  { value: "draft", label: "Brouillon", dotClassName: "bg-outline" },
  { value: "published", label: "Publié sur le site", dotClassName: "bg-secondary" },
];

export function ListingForm({ initial, agentOptions }: ListingFormProps) {
  const [draft, setDraft] = useState<Listing>(initial);
  const [state, action] = useActionState(saveListingAction, IDLE);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const patch = (changes: Partial<Listing>) => setDraft((current) => ({ ...current, ...changes }));
  const errors = state.status === "error" ? (state.fields ?? {}) : {};
  const section: SectionProps = { draft, errors, patch };
  const isNew = draft.id === "";
  const live = isPubliclyVisible(draft);

  return (
    <form action={action} className="grid gap-space-lg lg:grid-cols-[1fr_340px]">
      <input type="hidden" name="payload" value={JSON.stringify(draft)} />

      <div className="min-w-0 space-y-space-lg">
        <SectionCard icon="visibility" title="Visibilité" subtitle="Le CRM est la source de vérité : le site public suit vos choix instantanément.">
          <div className="grid gap-space-md sm:grid-cols-2">
            <Field label="Sur le site" htmlFor="visibility">
              <Segmented<Visibility> label="Visibilité" fullWidth value={draft.visibility} options={VISIBILITY_OPTIONS} onChange={(visibility) => patch({ visibility })} />
            </Field>
            <Field label="Statut du bien" htmlFor="status" hint={draft.status !== "available" ? "Un bien réservé, vendu ou loué disparaît du site." : undefined}>
              <SelectInput id="status" value={draft.status} onChange={(event) => patch({ status: event.target.value as ListingStatus })}>
                {(["available", "reserved", "closed"] as const).map((value) => (
                  <option key={value} value={value}>{statusLabel(value, draft.transaction)}</option>
                ))}
              </SelectInput>
            </Field>
          </div>
          {agentOptions.length > 0 && (
            <Field className="mt-space-md" label="Agent responsable" htmlFor="agentId">
              <SelectInput id="agentId" value={draft.agentId} onChange={(event) => patch({ agentId: event.target.value })}>
                {agentOptions.map((agent) => (
                  <option key={agent.id} value={agent.id}>{agent.label}</option>
                ))}
              </SelectInput>
            </Field>
          )}
        </SectionCard>

        <SectionCard icon="edit_note" title="L'annonce"><BasicsSection {...section} /></SectionCard>
        <SectionCard icon="payments" title="Prix et localisation"><PriceLocationSection {...section} /></SectionCard>
        <SectionCard icon="straighten" title="Caractéristiques"><FeaturesSection {...section} /></SectionCard>
        <SectionCard icon="deck" title="Équipements"><AmenitiesSection {...section} /></SectionCard>
        <SectionCard icon="photo_library" title="Photos"><PhotosSection {...section} /></SectionCard>
        <SectionCard icon="lock" title="Informations internes" subtitle="Visibles uniquement par l'équipe."><InternalSection {...section} /></SectionCard>
      </div>

      <aside className="space-y-space-md lg:sticky lg:top-[88px] lg:self-start">
        <div className="rounded-xl bg-surface-container-lowest p-space-md shadow-sm">
          <p className="mb-space-sm font-label-md text-label-md font-semibold text-on-surface">Aperçu sur le site</p>
          <div className="pointer-events-none">
            <ListingCard
              listing={toPublicListing({ ...draft, title: draft.title || "Titre de l'annonce", slug: draft.slug || "apercu" })}
              isFavorite={false}
              loginHref={null}
              showFavorite={false}
            />
          </div>
          <p className="mt-space-sm flex items-center gap-1 font-label-sm text-label-sm text-on-surface-variant">
            <Icon name={live ? "public" : "public_off"} className="text-[16px]" />
            {live ? "Visible sur le site après enregistrement." : "Non visible sur le site."}
          </p>
          <div className="mt-space-sm">
            <div className="mb-1 flex justify-between font-label-sm text-label-sm text-on-surface-variant">
              <span>Qualité de l'annonce</span>
              <span>{completenessPercent(draft)}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-surface-container-low">
              <div className="h-full rounded-full bg-secondary transition-all" style={{ width: `${completenessPercent(draft)}%` }} />
            </div>
          </div>
        </div>

        <FormMessage state={state} />

        <div className="flex flex-col gap-space-sm">
          <SubmitButton icon="save" size="lg" className="w-full">
            {isNew ? "Créer le bien" : "Enregistrer"}
          </SubmitButton>
          {!isNew && live && (
            <Link href={`/annonces/${draft.slug}`} target="_blank" className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg bg-surface-container-low font-label-md text-label-md text-on-surface hover:bg-surface-container-high">
              <Icon name="open_in_new" className="text-[18px]" />
              Voir sur le site
            </Link>
          )}
          <Link href="/crm/biens" className="inline-flex h-10 items-center justify-center font-label-md text-label-md text-on-surface-variant hover:text-on-surface">
            Retour à la liste
          </Link>
        </div>

        {!isNew && (
          <div className="rounded-xl bg-error-container/40 p-space-md">
            {confirmingDelete ? (
              <div className="space-y-space-sm">
                <p className="font-body-sm text-body-sm text-on-error-container">Supprimer définitivement ce bien ? Cette action est irréversible.</p>
                <div className="flex gap-space-sm">
                  <Button type="submit" variant="danger" size="sm" formAction={deleteListingAction.bind(null, draft.id)}>Oui, supprimer</Button>
                  <Button variant="ghost" size="sm" onClick={() => setConfirmingDelete(false)}>Annuler</Button>
                </div>
              </div>
            ) : (
              <Button variant="ghost" size="sm" className="text-error" onClick={() => setConfirmingDelete(true)}>
                <Icon name="delete" className="text-[18px]" />
                Supprimer ce bien
              </Button>
            )}
          </div>
        )}
      </aside>
    </form>
  );
}
