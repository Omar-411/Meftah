import { PROPERTY_TYPE_LABELS, TRANSACTION_LABELS, roomsLabel, type PropertyType, type TransactionType } from "./catalog";
import { cityLabel } from "../shared/locations";
import { formatAmount } from "../shared/format";
import type { PublicListing } from "./listing";

export interface ListingFilters {
  readonly transaction?: TransactionType;
  readonly cityId?: string;
  readonly propertyType?: PropertyType;
  readonly priceMin?: number;
  readonly priceMax?: number;
  readonly minRooms?: number;
  readonly minArea?: number;
}

export type SortKey = "recent" | "price-asc" | "price-desc" | "area-desc";

export const SORT_LABELS: Record<SortKey, string> = {
  recent: "Plus récentes",
  "price-asc": "Prix croissant",
  "price-desc": "Prix décroissant",
  "area-desc": "Surface décroissante",
};

export interface SearchQuery {
  readonly filters: ListingFilters;
  readonly sort: SortKey;
  readonly page: number;
  readonly pageSize: number;
}

export const DEFAULT_PAGE_SIZE = 9;

type RawParams = Readonly<Record<string, string | string[] | undefined>>;

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

function positiveInt(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

/** URL search params are the single source of truth for the search page state. */
export function parseSearchParams(params: RawParams): SearchQuery {
  const transaction = first(params.type);
  const propertyType = first(params.bien);
  const sort = first(params.tri);
  return {
    filters: {
      transaction: transaction === "sale" || transaction === "rent" ? transaction : undefined,
      cityId: first(params.ville) || undefined,
      propertyType: propertyType && propertyType in PROPERTY_TYPE_LABELS ? (propertyType as PropertyType) : undefined,
      priceMin: positiveInt(first(params.prixMin)),
      priceMax: positiveInt(first(params.prixMax)),
      minRooms: positiveInt(first(params.pieces)),
      minArea: positiveInt(first(params.surface)),
    },
    sort: sort && sort in SORT_LABELS ? (sort as SortKey) : "recent",
    page: positiveInt(first(params.page)) ?? 1,
    pageSize: DEFAULT_PAGE_SIZE,
  };
}

export function filtersToSearchParams(filters: ListingFilters, extra?: { sort?: SortKey; page?: number }): URLSearchParams {
  const params = new URLSearchParams();
  const set = (key: string, value: string | number | undefined) => {
    if (value !== undefined && value !== "") params.set(key, String(value));
  };
  set("type", filters.transaction);
  set("ville", filters.cityId);
  set("bien", filters.propertyType);
  set("prixMin", filters.priceMin);
  set("prixMax", filters.priceMax);
  set("pieces", filters.minRooms);
  set("surface", filters.minArea);
  if (extra?.sort && extra.sort !== "recent") set("tri", extra.sort);
  if (extra?.page && extra.page > 1) set("page", extra.page);
  return params;
}

export function searchHref(filters: ListingFilters, extra?: { sort?: SortKey; page?: number }): string {
  const query = filtersToSearchParams(filters, extra).toString();
  return query ? `/annonces?${query}` : "/annonces";
}

type Matchable = Pick<PublicListing, "transaction" | "cityId" | "propertyType" | "price" | "rooms" | "builtArea">;

/** Shared by the public search, saved-search alerts and tests. A hidden price never matches a price filter. */
export function matchesFilters(listing: Matchable, filters: ListingFilters): boolean {
  if (filters.transaction && listing.transaction !== filters.transaction) return false;
  if (filters.cityId && listing.cityId !== filters.cityId) return false;
  if (filters.propertyType && listing.propertyType !== filters.propertyType) return false;
  if (filters.minRooms && listing.rooms < filters.minRooms) return false;
  if (filters.minArea && listing.builtArea < filters.minArea) return false;
  const hasPriceFilter = filters.priceMin !== undefined || filters.priceMax !== undefined;
  if (hasPriceFilter) {
    if (listing.price === null) return false;
    if (filters.priceMin !== undefined && listing.price < filters.priceMin) return false;
    if (filters.priceMax !== undefined && listing.price > filters.priceMax) return false;
  }
  return true;
}

export function sortListings<T extends Pick<PublicListing, "price" | "builtArea" | "publishedAt">>(items: readonly T[], sort: SortKey): T[] {
  const copy = [...items];
  switch (sort) {
    case "price-asc":
      return copy.sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity));
    case "price-desc":
      return copy.sort((a, b) => (b.price ?? -1) - (a.price ?? -1));
    case "area-desc":
      return copy.sort((a, b) => b.builtArea - a.builtArea);
    default:
      return copy.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  }
}

export function describeFilters(filters: ListingFilters): string {
  const parts: string[] = [];
  const kind = filters.propertyType ? PROPERTY_TYPE_LABELS[filters.propertyType] : "Biens";
  parts.push(filters.transaction ? `${kind} · ${TRANSACTION_LABELS[filters.transaction]}` : kind);
  if (filters.cityId) parts.push(cityLabel(filters.cityId));
  if (filters.minRooms) parts.push(`${roomsLabel(filters.minRooms)} et +`);
  if (filters.minArea) parts.push(`${filters.minArea} m² min.`);
  if (filters.priceMin !== undefined && filters.priceMax !== undefined) {
    parts.push(`${formatAmount(filters.priceMin)} – ${formatAmount(filters.priceMax)} TND`);
  } else if (filters.priceMax !== undefined) {
    parts.push(`jusqu'à ${formatAmount(filters.priceMax)} TND`);
  } else if (filters.priceMin !== undefined) {
    parts.push(`dès ${formatAmount(filters.priceMin)} TND`);
  }
  return parts.join(" · ");
}

export function hasAnyFilter(filters: ListingFilters): boolean {
  return Object.values(filters).some((value) => value !== undefined);
}
