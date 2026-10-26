import { PROPERTY_TYPE_LABELS, ROOMS_OPTIONS, roomsLabel } from "@/domain/listing/catalog";
import type { ListingFilters, SortKey } from "@/domain/listing/filters";
import { SORT_LABELS } from "@/domain/listing/filters";
import { CITIES } from "@/domain/shared/locations";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";
import { Field, SelectInput, TextInput } from "@/components/ui/form";
import { Icon } from "@/components/ui/icon";
import Link from "next/link";

interface SearchFormProps {
  filters: ListingFilters;
  sort?: SortKey;
  /** "hero" is the compact home-page search; "full" adds budget, rooms and surface. */
  variant: "hero" | "full";
}

/**
 * A plain GET form: the URL is the single source of truth, so every search is shareable,
 * bookmarkable and works without client JavaScript.
 */
export function SearchForm({ filters, sort, variant }: SearchFormProps) {
  const full = variant === "full";
  return (
    <form action="/annonces" method="get" className="rounded-2xl bg-surface-container-lowest p-space-md shadow-lg">
      <fieldset className="mb-space-md inline-flex rounded-lg bg-surface-container-low p-1">
        <legend className="sr-only">Type de transaction</legend>
        {(["sale", "rent"] as const).map((value) => (
          <label key={value} className="cursor-pointer">
            <input type="radio" name="type" value={value} defaultChecked={filters.transaction === value} className="peer sr-only" />
            <span className="block rounded-md px-space-lg py-1.5 font-label-md text-label-md text-on-surface-variant transition-all peer-checked:bg-surface-container-lowest peer-checked:font-semibold peer-checked:text-primary peer-checked:shadow-sm peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-primary-container">
              {value === "sale" ? "Acheter" : "Louer"}
            </span>
          </label>
        ))}
        <label className="cursor-pointer">
          <input type="radio" name="type" value="" defaultChecked={!filters.transaction} className="peer sr-only" />
          <span className="block rounded-md px-space-lg py-1.5 font-label-md text-label-md text-on-surface-variant transition-all peer-checked:bg-surface-container-lowest peer-checked:font-semibold peer-checked:text-primary peer-checked:shadow-sm peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-primary-container">
            Tout
          </span>
        </label>
      </fieldset>

      <div className={cn("grid gap-space-md", full ? "sm:grid-cols-2 lg:grid-cols-4" : "sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_auto]")}>
        <Field label="Ville" htmlFor="ville">
          <SelectInput id="ville" name="ville" defaultValue={filters.cityId ?? ""}>
            <option value="">Toutes les villes</option>
            {CITIES.map((city) => (
              <option key={city.id} value={city.id}>
                {city.label}
              </option>
            ))}
          </SelectInput>
        </Field>

        <Field label="Type de bien" htmlFor="bien">
          <SelectInput id="bien" name="bien" defaultValue={filters.propertyType ?? ""}>
            <option value="">Tous les biens</option>
            {Object.entries(PROPERTY_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </SelectInput>
        </Field>

        <Field label="Budget max (TND)" htmlFor="prixMax">
          <TextInput id="prixMax" name="prixMax" inputMode="numeric" placeholder="Ex. 600000" defaultValue={filters.priceMax ?? ""} />
        </Field>

        {full && (
          <>
            <Field label="Budget min (TND)" htmlFor="prixMin">
              <TextInput id="prixMin" name="prixMin" inputMode="numeric" placeholder="Ex. 200000" defaultValue={filters.priceMin ?? ""} />
            </Field>
            <Field label="Pièces min." htmlFor="pieces">
              <SelectInput id="pieces" name="pieces" defaultValue={filters.minRooms ?? ""}>
                <option value="">Indifférent</option>
                {ROOMS_OPTIONS.map((rooms) => (
                  <option key={rooms} value={rooms}>
                    {roomsLabel(rooms)} et +
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Surface min. (m²)" htmlFor="surface">
              <TextInput id="surface" name="surface" inputMode="numeric" placeholder="Ex. 100" defaultValue={filters.minArea ?? ""} />
            </Field>
            <Field label="Trier par" htmlFor="tri">
              <SelectInput id="tri" name="tri" defaultValue={sort ?? "recent"}>
                {Object.entries(SORT_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </SelectInput>
            </Field>
          </>
        )}

        <div className={cn("flex items-end gap-space-sm", full && "sm:col-span-2 lg:col-span-4 lg:justify-end")}>
          {full && (
            <Link href="/annonces" className="inline-flex h-10 items-center px-space-md font-label-md text-label-md text-on-surface-variant hover:text-on-surface">
              Réinitialiser
            </Link>
          )}
          <Button type="submit" size="md" className="min-w-0 flex-1 sm:flex-none">
            <Icon name="search" className="text-[20px]" />
            Rechercher
          </Button>
        </div>
      </div>
    </form>
  );
}
