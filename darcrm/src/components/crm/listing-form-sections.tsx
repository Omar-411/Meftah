"use client";

import { AMENITIES, MANDATE_LABELS, PROPERTY_TYPE_LABELS, TRANSACTION_LABELS, type MandateType, type PropertyType, type TransactionType } from "@/domain/listing/catalog";
import { AD_TITLE_MAX_LENGTH, agencyCommission, pricePerSqm, type Listing, type ListingInternal } from "@/domain/listing/listing";
import { CITIES } from "@/domain/shared/locations";
import { formatAmount } from "@/domain/shared/format";
import { cn } from "@/lib/cn";
import { Field, Segmented, SelectInput, Stepper, TextInput, Textarea, UnitInput } from "@/components/ui/form";
import { Icon } from "@/components/ui/icon";
import { roomsLabel } from "@/domain/listing/catalog";
import { PhotoManager } from "./photo-manager";

export interface SectionProps {
  draft: Listing;
  errors: Readonly<Record<string, string>>;
  patch: (changes: Partial<Listing>) => void;
}

const Toggle = ({ id, checked, onChange, label }: { id: string; checked: boolean; onChange: (value: boolean) => void; label: string }) => (
  <label htmlFor={id} className="flex cursor-pointer items-center gap-2 font-body-md text-body-md text-on-surface">
    <input id={id} type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="h-4 w-4 accent-primary-container" />
    {label}
  </label>
);

export function BasicsSection({ draft, errors, patch }: SectionProps) {
  const remaining = AD_TITLE_MAX_LENGTH - draft.title.length;
  return (
    <div className="space-y-space-md">
      <div className="grid gap-space-md sm:grid-cols-2">
        <Field label="Transaction" htmlFor="transaction">
          <Segmented<TransactionType>
            label="Transaction"
            fullWidth
            value={draft.transaction}
            onChange={(transaction) => patch({ transaction })}
            options={(Object.keys(TRANSACTION_LABELS) as TransactionType[]).map((value) => ({ value, label: TRANSACTION_LABELS[value] }))}
          />
        </Field>
        <Field label="Type de bien" htmlFor="propertyType">
          <SelectInput id="propertyType" value={draft.propertyType} onChange={(event) => patch({ propertyType: event.target.value as PropertyType })}>
            {Object.entries(PROPERTY_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </SelectInput>
        </Field>
      </div>

      <Field label="Titre de l'annonce" htmlFor="title" error={errors.title} aside={<span className={cn("font-label-sm text-label-sm", remaining < 0 ? "text-error" : "text-on-surface-variant")}>{remaining}</span>}>
        <TextInput id="title" value={draft.title} onChange={(event) => patch({ title: event.target.value })} placeholder="Ex. Villa avec piscine à La Marsa" error={errors.title} />
      </Field>

      <Field label="Description" htmlFor="description" hint="Décrivez les atouts du bien : lumière, vue, état, environnement.">
        <Textarea id="description" rows={6} value={draft.description} onChange={(event) => patch({ description: event.target.value })} />
      </Field>
    </div>
  );
}

export function PriceLocationSection({ draft, errors, patch }: SectionProps) {
  const perSqm = pricePerSqm({ price: draft.price, builtArea: draft.builtArea, transaction: draft.transaction });
  return (
    <div className="space-y-space-md">
      <div className="grid gap-space-md sm:grid-cols-2">
        <Field label={draft.transaction === "rent" ? "Loyer mensuel" : "Prix de vente"} htmlFor="price" error={errors.price} hint={perSqm ? `${formatAmount(perSqm)} TND / m²` : undefined}>
          <UnitInput id="price" unit="TND" unitWidthClass="pr-14" emphasized value={draft.price} onChange={(price) => patch({ price })} error={errors.price} />
        </Field>
        <Field label="Charges mensuelles" htmlFor="condoFees">
          <UnitInput id="condoFees" unit="TND" unitWidthClass="pr-14" value={draft.condoFees} onChange={(condoFees) => patch({ condoFees })} />
        </Field>
      </div>
      <Toggle id="hidePrice" checked={draft.hidePrice} onChange={(hidePrice) => patch({ hidePrice })} label="Afficher « Prix sur demande » sur le site" />

      <div className="grid gap-space-md sm:grid-cols-2">
        <Field label="Ville" htmlFor="cityId">
          <SelectInput id="cityId" value={draft.cityId} onChange={(event) => patch({ cityId: event.target.value })}>
            {CITIES.map((city) => (
              <option key={city.id} value={city.id}>{city.label}</option>
            ))}
          </SelectInput>
        </Field>
        <Field label="Quartier" htmlFor="district" error={errors.district}>
          <TextInput id="district" value={draft.district} onChange={(event) => patch({ district: event.target.value })} placeholder="Ex. Marsa Corniche" error={errors.district} />
        </Field>
      </div>
      <Field label="Adresse" htmlFor="address">
        <TextInput id="address" value={draft.address} onChange={(event) => patch({ address: event.target.value })} placeholder="Rue, numéro" />
      </Field>
      <Toggle id="hideExactAddress" checked={draft.hideExactAddress} onChange={(hideExactAddress) => patch({ hideExactAddress })} label="Masquer l'adresse exacte sur le site (quartier seulement)" />
    </div>
  );
}

export function FeaturesSection({ draft, errors, patch }: SectionProps) {
  return (
    <div className="space-y-space-md">
      <div className="grid gap-space-md sm:grid-cols-2">
        <Field label="Surface couverte" htmlFor="builtArea" error={errors.builtArea}>
          <UnitInput id="builtArea" unit="m²" unitWidthClass="pr-10" value={draft.builtArea} onChange={(builtArea) => patch({ builtArea })} error={errors.builtArea} />
        </Field>
        <Field label="Terrasse / jardin" htmlFor="terraceArea">
          <UnitInput id="terraceArea" unit="m²" unitWidthClass="pr-10" value={draft.terraceArea} onChange={(terraceArea) => patch({ terraceArea })} />
        </Field>
      </div>
      <div className="grid gap-space-md sm:grid-cols-3">
        <Field label="Pièces" htmlFor="rooms">
          <Stepper id="rooms" value={draft.rooms} min={0} format={(value) => (value === 0 ? "—" : roomsLabel(value))} onChange={(rooms) => patch({ rooms })} />
        </Field>
        <Field label="Chambres" htmlFor="bedrooms">
          <Stepper id="bedrooms" value={draft.bedrooms} format={String} onChange={(bedrooms) => patch({ bedrooms })} />
        </Field>
        <Field label="Salles de bain" htmlFor="bathrooms">
          <Stepper id="bathrooms" value={draft.bathrooms} format={String} onChange={(bathrooms) => patch({ bathrooms })} />
        </Field>
      </div>
      <div className="grid gap-space-md sm:grid-cols-2">
        <Field label="Étage" htmlFor="floorDescription">
          <TextInput id="floorDescription" value={draft.floorDescription} onChange={(event) => patch({ floorDescription: event.target.value })} placeholder="Ex. 3ᵉ étage sur 5" />
        </Field>
        <Field label="Titre de propriété" htmlFor="titleDeed">
          <TextInput id="titleDeed" value={draft.titleDeed} onChange={(event) => patch({ titleDeed: event.target.value })} />
        </Field>
      </div>
    </div>
  );
}

export function AmenitiesSection({ draft, patch }: SectionProps) {
  const toggle = (id: string) =>
    patch({ amenityIds: draft.amenityIds.includes(id) ? draft.amenityIds.filter((value) => value !== id) : [...draft.amenityIds, id] });
  return (
    <ul className="flex flex-wrap gap-space-sm">
      {AMENITIES.map((amenity) => {
        const active = draft.amenityIds.includes(amenity.id);
        return (
          <li key={amenity.id}>
            <button
              type="button"
              aria-pressed={active}
              onClick={() => toggle(amenity.id)}
              className={cn(
                "flex items-center gap-1.5 rounded-full px-space-md py-1.5 font-label-md text-label-md transition-colors",
                active ? "bg-primary-container text-on-primary" : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high",
              )}
            >
              <Icon name={amenity.icon} className="text-[18px]" />
              {amenity.label}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

export function PhotosSection({ draft, errors, patch }: SectionProps) {
  return <PhotoManager photos={draft.photos} title={draft.title} error={errors.photos} onChange={(photos) => patch({ photos })} />;
}

export function InternalSection({ draft, patch }: SectionProps) {
  const setInternal = (changes: Partial<ListingInternal>) => patch({ internal: { ...draft.internal, ...changes } });
  const { internal } = draft;
  return (
    <div className="space-y-space-md">
      <p className="flex items-start gap-2 rounded-lg bg-tertiary-fixed/60 px-space-md py-2 font-body-sm text-body-sm text-on-tertiary-fixed-variant">
        <Icon name="lock" className="mt-0.5 text-[18px]" />
        Ces informations restent dans le CRM. Elles ne sont jamais affichées sur le site public.
      </p>
      <div className="grid gap-space-md sm:grid-cols-2">
        <Field label="Propriétaire" htmlFor="ownerName">
          <TextInput id="ownerName" value={internal.ownerName} onChange={(event) => setInternal({ ownerName: event.target.value })} />
        </Field>
        <Field label="Téléphone du propriétaire" htmlFor="ownerPhone">
          <TextInput id="ownerPhone" type="tel" value={internal.ownerPhone} onChange={(event) => setInternal({ ownerPhone: event.target.value })} />
        </Field>
      </div>
      <div className="grid gap-space-md sm:grid-cols-3">
        <Field label="Type de mandat" htmlFor="mandateType">
          <SelectInput id="mandateType" value={internal.mandateType} onChange={(event) => setInternal({ mandateType: event.target.value as MandateType })}>
            {Object.entries(MANDATE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </SelectInput>
        </Field>
        <Field label="N° de mandat" htmlFor="mandateNumber">
          <TextInput id="mandateNumber" value={internal.mandateNumber} onChange={(event) => setInternal({ mandateNumber: event.target.value })} />
        </Field>
        <Field label="Échéance" htmlFor="mandateExpiry">
          <TextInput id="mandateExpiry" type="date" value={internal.mandateExpiry} onChange={(event) => setInternal({ mandateExpiry: event.target.value })} />
        </Field>
      </div>
      <div className="grid gap-space-md sm:grid-cols-2">
        <Field label="Commission agence (%)" htmlFor="commissionRate" hint={draft.price > 0 ? `≈ ${formatAmount(agencyCommission(draft))} TND` : undefined}>
          <TextInput
            id="commissionRate"
            inputMode="decimal"
            value={String(internal.commissionRate)}
            onChange={(event) => setInternal({ commissionRate: Number(event.target.value.replace(",", ".")) || 0 })}
          />
        </Field>
        <Field label="Emplacement des clés" htmlFor="keysLocation">
          <TextInput id="keysLocation" value={internal.keysLocation} onChange={(event) => setInternal({ keysLocation: event.target.value })} />
        </Field>
      </div>
      <Field label="Notes internes" htmlFor="notes">
        <Textarea id="notes" rows={3} value={internal.notes} onChange={(event) => setInternal({ notes: event.target.value })} />
      </Field>
    </div>
  );
}
