import type { Metadata } from "next";
import Link from "next/link";
import { listCrmListings } from "@/application/crm/listings";
import type { CrmListingQuery } from "@/application/ports";
import { PROPERTY_TYPE_LABELS, TRANSACTION_LABELS, type ListingStatus, type TransactionType, type Visibility } from "@/domain/listing/catalog";
import { completenessPercent } from "@/domain/listing/listing";
import { cityLabel } from "@/domain/shared/locations";
import { getDeps } from "@/infrastructure/container";
import { ListingRowActions } from "@/components/crm/listing-row-actions";
import { ListingStatusBadge, VisibilityBadge } from "@/components/crm/badges";
import { ListingThumb } from "@/components/crm/listing-thumb";
import { PageHeader } from "@/components/crm/page-header";
import { Amount } from "@/components/ui/amount";
import { Button, ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { SelectInput, TextInput } from "@/components/ui/form";
import { Icon } from "@/components/ui/icon";
import { requireStaffPage, loadOrRedirect } from "../_lib/guard";

export const metadata: Metadata = { title: "Biens" };

type SearchParams = Promise<Record<string, string | undefined>>;

function parseQuery(params: Record<string, string | undefined>): CrmListingQuery {
  return {
    q: params.q?.trim() || undefined,
    status: (["available", "reserved", "closed"] as const).find((value) => value === params.statut) as ListingStatus | undefined,
    visibility: (["draft", "published"] as const).find((value) => value === params.visibilite) as Visibility | undefined,
    transaction: (["sale", "rent"] as const).find((value) => value === params.type) as TransactionType | undefined,
  };
}

export default async function ListingsAdminPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await requireStaffPage("/crm/biens");
  const params = await searchParams;
  const query = parseQuery(params);
  const listings = await loadOrRedirect(() => listCrmListings(getDeps(), session, query));
  const filtered = Object.values(query).some(Boolean);

  return (
    <>
      <PageHeader
        title="Biens"
        subtitle={session.role === "admin" ? "Tous les biens de l'agence." : "Vos biens. Les modifications sont visibles sur le site dès l'enregistrement."}
        actions={
          <ButtonLink href="/crm/biens/nouveau">
            <Icon name="add" className="text-[20px]" />
            Nouveau bien
          </ButtonLink>
        }
      />

      <form method="get" className="mb-space-md grid gap-space-sm rounded-xl bg-surface-container-lowest p-space-md shadow-sm sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1fr_auto]">
        <TextInput name="q" placeholder="Réf., titre ou quartier" defaultValue={query.q} aria-label="Rechercher un bien" />
        <SelectInput name="type" defaultValue={query.transaction ?? ""} aria-label="Transaction">
          <option value="">Vente et location</option>
          <option value="sale">Vente</option>
          <option value="rent">Location</option>
        </SelectInput>
        <SelectInput name="visibilite" defaultValue={query.visibility ?? ""} aria-label="Visibilité">
          <option value="">En ligne et brouillons</option>
          <option value="published">En ligne</option>
          <option value="draft">Brouillons</option>
        </SelectInput>
        <SelectInput name="statut" defaultValue={query.status ?? ""} aria-label="Statut">
          <option value="">Tous les statuts</option>
          <option value="available">Disponible</option>
          <option value="reserved">Réservé</option>
          <option value="closed">Vendu / loué</option>
        </SelectInput>
        <div className="flex gap-space-sm">
          <Button type="submit" variant="secondary">Filtrer</Button>
          {filtered && <ButtonLink href="/crm/biens" variant="ghost">Effacer</ButtonLink>}
        </div>
      </form>

      {listings.length === 0 ? (
        <EmptyState
          icon="home_work"
          title={filtered ? "Aucun bien ne correspond" : "Aucun bien pour le moment"}
          description={filtered ? "Modifiez ou effacez les filtres." : "Créez votre première annonce : elle apparaîtra sur le site dès sa publication."}
          action={!filtered && <ButtonLink href="/crm/biens/nouveau">Créer un bien</ButtonLink>}
        />
      ) : (
        <div className="overflow-hidden rounded-xl bg-surface-container-lowest shadow-sm">
          <ul className="divide-y divide-outline-variant/30">
            {listings.map((listing) => (
              <li key={listing.id} className="flex flex-wrap items-center gap-space-md px-space-md py-space-sm">
                <Link href={`/crm/biens/${listing.ref}/modifier`} className="flex min-w-[260px] flex-1 items-center gap-space-md">
                  <ListingThumb url={listing.photos[0]?.url ?? null} alt={listing.photos[0]?.alt ?? listing.title} />
                  <span className="min-w-0">
                    <span className="block truncate font-label-md text-label-md font-semibold text-on-surface">{listing.title || "Sans titre"}</span>
                    <span className="block truncate font-body-sm text-body-sm text-on-surface-variant">
                      {listing.ref} · {PROPERTY_TYPE_LABELS[listing.propertyType]} · {TRANSACTION_LABELS[listing.transaction]} · {listing.district ? `${listing.district}, ` : ""}{cityLabel(listing.cityId)}
                    </span>
                  </span>
                </Link>
                <Amount value={listing.price} className="w-36 text-[16px]" />
                <span className="flex items-center gap-1.5">
                  <VisibilityBadge visibility={listing.visibility} />
                  <ListingStatusBadge status={listing.status} transaction={listing.transaction} />
                </span>
                <span className="hidden w-16 text-right font-label-sm text-label-sm text-on-surface-variant md:block" title="Qualité de l'annonce">{completenessPercent(listing)}%</span>
                <ListingRowActions id={listing.id} visibility={listing.visibility} status={listing.status} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
