import type { AgencyRepository, AgentRepository, CityCount, CrmListingQuery, ListingRepository, PublicListingRepository, UserRepository } from "../../../application/ports";
import type { PublicUser } from "../../../domain/account/account";
import type { AgencySettings } from "../../../domain/agency/agency";
import type { Agent } from "../../../domain/agent/agent";
import { canAccess, type StaffScope } from "../../../domain/auth/session";
import { matchesFilters, sortListings, type SearchQuery } from "../../../domain/listing/filters";
import { isPubliclyVisible, toPublicListing, type Listing, type PublicListing } from "../../../domain/listing/listing";
import type { Collection, Database } from "../database";

const REF_COUNTER = "listingRef";
export const INITIAL_REF = 1000;

const includesText = (values: string[], needle: string) => values.some((value) => value.toLowerCase().includes(needle.toLowerCase()));

export class CollectionAgencyRepository implements AgencyRepository {
  private readonly agency: Collection<AgencySettings>;
  constructor(db: Database) {
    this.agency = db.collection<AgencySettings>("agency");
  }
  async get() {
    const [first] = await this.agency.all();
    if (!first) throw new Error("Aucune agence configurée : lancez le seed ou définissez ADMIN_EMAIL/ADMIN_PASSWORD.");
    return first;
  }
  async save(agency: AgencySettings) {
    await this.agency.put(agency);
  }
}

export class CollectionAgentRepository implements AgentRepository {
  private readonly agents: Collection<Agent>;
  constructor(db: Database) {
    this.agents = db.collection<Agent>("agents");
  }
  list() {
    return this.agents.all();
  }
  findById(id: string) {
    return this.agents.get(id);
  }
  save(agent: Agent) {
    return this.agents.put(agent);
  }
}

export class CollectionUserRepository implements UserRepository {
  private readonly users: Collection<PublicUser>;
  constructor(db: Database) {
    this.users = db.collection<PublicUser>("users");
  }
  findById(id: string) {
    return this.users.get(id);
  }
  save(user: PublicUser) {
    return this.users.put(user);
  }
}

export class CollectionListingRepository implements ListingRepository {
  private readonly listings: Collection<Listing>;
  private readonly favorites: Collection<{ id: string; userId: string; listingId: string }>;
  constructor(private readonly db: Database) {
    this.listings = db.collection<Listing>("listings");
    this.favorites = db.collection("favorites");
  }

  async list(scope: StaffScope, query: CrmListingQuery) {
    const all = await this.listings.all();
    return all
      .filter((listing) => canAccess(scope, listing.agentId))
      .filter((listing) => !query.ref || listing.ref === query.ref)
      .filter((listing) => !query.status || listing.status === query.status)
      .filter((listing) => !query.visibility || listing.visibility === query.visibility)
      .filter((listing) => !query.transaction || listing.transaction === query.transaction)
      .filter((listing) => !query.agentId || listing.agentId === query.agentId)
      .filter((listing) => !query.q || includesText([listing.title, listing.ref, listing.district, listing.internal.ownerName], query.q))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  findById(id: string) {
    return this.listings.get(id);
  }

  async findByRef(ref: string) {
    return (await this.listings.all()).find((listing) => listing.ref === ref) ?? null;
  }

  async nextRef() {
    return `REF-${await this.db.nextCounter(REF_COUNTER, INITIAL_REF)}`;
  }

  async save(listing: Listing) {
    await this.listings.put(listing);
    return listing;
  }

  async remove(id: string) {
    await this.listings.remove(id);
    const favorites = await this.favorites.all();
    await Promise.all(favorites.filter((favorite) => favorite.listingId === id).map((favorite) => this.favorites.remove(favorite.id)));
  }
}

/** Only ever returns the whitelist projection of published + available listings. */
export class CollectionPublicListingRepository implements PublicListingRepository {
  private readonly listings: Collection<Listing>;
  constructor(db: Database) {
    this.listings = db.collection<Listing>("listings");
  }

  private async visible(): Promise<PublicListing[]> {
    return (await this.listings.all()).filter(isPubliclyVisible).map(toPublicListing);
  }

  async search(query: SearchQuery) {
    const matching = sortListings((await this.visible()).filter((listing) => matchesFilters(listing, query.filters)), query.sort);
    const start = (query.page - 1) * query.pageSize;
    return { items: matching.slice(start, start + query.pageSize), total: matching.length, page: query.page, pageSize: query.pageSize };
  }

  async findBySlug(slug: string) {
    return (await this.visible()).find((listing) => listing.slug === slug) ?? null;
  }

  async findByIds(ids: readonly string[]) {
    return (await this.visible()).filter((listing) => ids.includes(listing.id));
  }

  async featured(limit: number) {
    return sortListings(await this.visible(), "recent").slice(0, limit);
  }

  async similarTo(slug: string, limit: number) {
    const visible = await this.visible();
    const current = visible.find((listing) => listing.slug === slug);
    if (!current) return [];
    return visible
      .filter((listing) => listing.slug !== slug && listing.transaction === current.transaction)
      .map((listing) => ({ listing, score: (listing.cityId === current.cityId ? 2 : 0) + (listing.propertyType === current.propertyType ? 1 : 0) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((entry) => entry.listing);
  }

  async cityCounts(): Promise<CityCount[]> {
    const counts = new Map<string, number>();
    for (const listing of await this.visible()) counts.set(listing.cityId, (counts.get(listing.cityId) ?? 0) + 1);
    return [...counts.entries()].map(([cityId, count]) => ({ cityId, count })).sort((a, b) => b.count - a.count);
  }
}
