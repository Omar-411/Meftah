import type { Metadata } from "next";
import { getDeps } from "@/infrastructure/container";
import { searchListings } from "@/application/public/listings";
import { describeFilters, hasAnyFilter, parseSearchParams, filtersToSearchParams, searchHref } from "@/domain/listing/filters";
import { pluralize } from "@/domain/shared/format";
import { ListingCard } from "@/components/public/listing-card";
import { SaveSearchForm } from "@/components/public/save-search-form";
import { SearchForm } from "@/components/public/search-form";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { getVisitorContext, loginHrefFor } from "../visitor";

export const metadata: Metadata = { title: "Annonces · DarCRM" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function ListingsPage({ searchParams }: { searchParams: SearchParams }) {
  const query = parseSearchParams(await searchParams);
  const deps = getDeps();
  const [results, visitor, agency] = await Promise.all([searchListings(deps, query), getVisitorContext(), deps.agency.get()]);

  const queryString = filtersToSearchParams(query.filters, { sort: query.sort, page: query.page }).toString();
  const returnTo = queryString ? `/annonces?${queryString}` : "/annonces";
  const filtered = hasAnyFilter(query.filters);
  const isVisitor = visitor.session?.role === "user";

  return (
    <div className="mx-auto max-w-[1200px] px-space-md py-space-lg lg:px-gutter-desktop">
      <SearchForm filters={query.filters} sort={query.sort} variant="full" />

      <div className="mt-space-lg flex flex-wrap items-center justify-between gap-space-md">
        <div>
          <h1 className="font-display text-[22px] font-semibold text-on-surface">{pluralize(results.total, "bien trouvé", "biens trouvés")}</h1>
          {filtered && <p className="font-body-sm text-body-sm text-on-surface-variant">{describeFilters(query.filters)}</p>}
        </div>
        {visitor.canFavorite && (
          <SaveSearchForm
            queryString={queryString}
            loginHref={loginHrefFor(visitor, returnTo)}
            defaultPhone=""
            alertsEnabled={agency.whatsappAlertsEnabled}
            disabled={!filtered || !isVisitor}
          />
        )}
      </div>

      <div className="mt-space-md">
        {results.items.length === 0 ? (
          <EmptyState
            icon="search_off"
            title="Aucun bien ne correspond"
            description="Élargissez votre budget ou choisissez une autre ville. Vous pouvez aussi enregistrer cette recherche pour être prévenu dès qu'un bien correspondant est publié."
            action={<ButtonLink href="/annonces" variant="secondary">Voir toutes les annonces</ButtonLink>}
          />
        ) : (
          <div className="grid gap-space-lg sm:grid-cols-2 lg:grid-cols-3">
            {results.items.map((listing) => (
              <ListingCard
                key={listing.id}
                listing={listing}
                isFavorite={visitor.favoriteIds.has(listing.id)}
                loginHref={loginHrefFor(visitor, returnTo)}
                showFavorite={visitor.canFavorite}
              />
            ))}
          </div>
        )}
      </div>

      <Pagination
        page={results.page}
        total={results.total}
        pageSize={results.pageSize}
        hrefFor={(page) => searchHref(query.filters, { sort: query.sort, page })}
      />
    </div>
  );
}
