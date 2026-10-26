import { formatAmount } from "../shared/format";
import type { SearchCriteria } from "../lead/lead";
import { cityLabel } from "../shared/locations";
import { PROPERTY_TYPE_LABELS, roomsLabel } from "../listing/catalog";
import type { Listing } from "../listing/listing";

export interface MatchResult {
  readonly listingId: string;
  readonly score: number;
  readonly reasons: readonly string[];
}

export const MIN_MATCH_SCORE = 50;

const WEIGHTS = { type: 25, city: 25, budget: 30, rooms: 10, area: 10 } as const;
const BUDGET_TOLERANCE = 0.1;

type Candidate = Pick<Listing, "id" | "transaction" | "propertyType" | "cityId" | "price" | "rooms" | "builtArea" | "status" | "visibility">;

/**
 * Scores a listing against a lead's criteria. Only criteria the lead actually set count, so a lead with
 * a budget and a city is not penalised for having no room preference. Wrong transaction type excludes.
 */
export function scoreListing(criteria: SearchCriteria, listing: Candidate): MatchResult | null {
  if (listing.status !== "available" || listing.visibility !== "published") return null;
  if (listing.transaction !== criteria.transaction) return null;

  let earned = 0;
  let possible = 0;
  const reasons: string[] = [];

  if (criteria.propertyTypes.length > 0) {
    possible += WEIGHTS.type;
    if (criteria.propertyTypes.includes(listing.propertyType)) {
      earned += WEIGHTS.type;
      reasons.push(PROPERTY_TYPE_LABELS[listing.propertyType]);
    }
  }

  if (criteria.cityIds.length > 0) {
    possible += WEIGHTS.city;
    if (criteria.cityIds.includes(listing.cityId)) {
      earned += WEIGHTS.city;
      reasons.push(cityLabel(listing.cityId));
    }
  }

  if (criteria.budgetMin !== undefined || criteria.budgetMax !== undefined) {
    possible += WEIGHTS.budget;
    const min = criteria.budgetMin ?? 0;
    const max = criteria.budgetMax ?? Infinity;
    if (listing.price >= min && listing.price <= max) {
      earned += WEIGHTS.budget;
      reasons.push(`Dans le budget (${formatAmount(listing.price)} TND)`);
    } else if (listing.price > max && listing.price <= max * (1 + BUDGET_TOLERANCE)) {
      earned += WEIGHTS.budget / 2;
      reasons.push("Légèrement au-dessus du budget");
    }
  }

  if (criteria.minRooms) {
    possible += WEIGHTS.rooms;
    if (listing.rooms >= criteria.minRooms) {
      earned += WEIGHTS.rooms;
      reasons.push(`${roomsLabel(listing.rooms)}`);
    }
  }

  if (criteria.minArea) {
    possible += WEIGHTS.area;
    if (listing.builtArea >= criteria.minArea) {
      earned += WEIGHTS.area;
      reasons.push(`${listing.builtArea} m²`);
    }
  }

  const score = possible === 0 ? 0 : Math.round((earned / possible) * 100);
  return score >= MIN_MATCH_SCORE ? { listingId: listing.id, score, reasons } : null;
}

export function rankMatches(criteria: SearchCriteria, listings: readonly Candidate[]): MatchResult[] {
  return listings
    .map((listing) => scoreListing(criteria, listing))
    .filter((match): match is MatchResult => match !== null)
    .sort((a, b) => b.score - a.score);
}

export function hasCriteria(criteria: SearchCriteria): boolean {
  return (
    criteria.propertyTypes.length > 0 ||
    criteria.cityIds.length > 0 ||
    criteria.budgetMin !== undefined ||
    criteria.budgetMax !== undefined ||
    Boolean(criteria.minRooms) ||
    Boolean(criteria.minArea)
  );
}
