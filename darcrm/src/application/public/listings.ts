import type { PublicAgent } from "@/domain/agent/agent";
import { toPublicAgent } from "@/domain/agent/agent";
import type { AgencySettings } from "@/domain/agency/agency";
import type { SearchQuery } from "@/domain/listing/filters";
import type { PublicListing } from "@/domain/listing/listing";
import type { Page } from "@/domain/shared/result";
import { NotFoundError } from "../errors";
import type { CityCount, Deps } from "../ports";

type PublicDeps = Pick<Deps, "publicListings" | "agents" | "agency" | "accounts">;

export function searchListings(deps: Pick<Deps, "publicListings">, query: SearchQuery): Promise<Page<PublicListing>> {
  return deps.publicListings.search(query);
}

export interface HomeView {
  readonly agency: AgencySettings;
  readonly featured: readonly PublicListing[];
  readonly cities: readonly CityCount[];
}

export async function getHome(deps: PublicDeps): Promise<HomeView> {
  const [agency, featured, cities] = await Promise.all([
    deps.agency.get(),
    deps.publicListings.featured(6),
    deps.publicListings.cityCounts(),
  ]);
  return { agency, featured, cities };
}

export interface ListingDetailView {
  readonly listing: PublicListing;
  readonly agent: PublicAgent;
  readonly agency: AgencySettings;
  readonly similar: readonly PublicListing[];
  readonly isFavorite: boolean;
}

export async function getListingDetail(deps: PublicDeps, slug: string, userId: string | null): Promise<ListingDetailView> {
  const listing = await deps.publicListings.findBySlug(slug);
  if (!listing) throw new NotFoundError();

  const [agent, agency, similar, favoriteIds] = await Promise.all([
    deps.agents.findById(listing.agentId),
    deps.agency.get(),
    deps.publicListings.similarTo(slug, 3),
    userId ? deps.accounts.listFavoriteIds(userId) : Promise.resolve<string[]>([]),
  ]);
  if (!agent) throw new NotFoundError();

  return {
    listing,
    agent: toPublicAgent(agent),
    agency,
    similar,
    isFavorite: favoriteIds.includes(listing.id),
  };
}
