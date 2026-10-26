import { scopeOf, type Session } from "@/domain/auth/session";
import { hasCriteria, rankMatches, type MatchResult } from "@/domain/matching/matching";
import { isOpenStage, type Lead } from "@/domain/lead/lead";
import { requireStaff } from "../guards";
import type { Deps } from "../ports";
import { toListingBrief, type ListingBrief } from "./types";

export interface LeadMatches {
  readonly lead: Lead;
  readonly matches: ReadonlyArray<{ match: MatchResult; listing: ListingBrief }>;
}

export interface ListingMatches {
  readonly listing: ListingBrief;
  readonly leads: ReadonlyArray<{ match: MatchResult; lead: Lead }>;
}

export interface MatchingOverview {
  readonly byLead: readonly LeadMatches[];
  readonly byListing: readonly ListingMatches[];
}

/**
 * Both directions of the matching feature. Leads are scoped to the staff member,
 * but every published listing is a candidate, so an agent can propose a colleague's property.
 */
export async function getMatchingOverview(deps: Pick<Deps, "leads" | "listings">, session: Session | null): Promise<MatchingOverview> {
  const staff = requireStaff(session);
  const [leads, listings] = await Promise.all([deps.leads.list(scopeOf(staff), {}), deps.listings.list({ kind: "all" }, {})]);

  const briefById = new Map(listings.map((listing) => [listing.id, toListingBrief(listing)]));
  const candidates = leads.filter((lead) => isOpenStage(lead.stage) && hasCriteria(lead.criteria));

  const byLead = candidates
    .map<LeadMatches>((lead) => ({
      lead,
      matches: rankMatches(lead.criteria, listings).flatMap((match) => {
        const listing = briefById.get(match.listingId);
        return listing ? [{ match, listing }] : [];
      }),
    }))
    .filter((entry) => entry.matches.length > 0)
    .sort((a, b) => (b.matches[0]?.match.score ?? 0) - (a.matches[0]?.match.score ?? 0));

  const leadsByListing = new Map<string, Array<{ match: MatchResult; lead: Lead }>>();
  for (const entry of byLead) {
    for (const { match } of entry.matches) {
      const bucket = leadsByListing.get(match.listingId) ?? [];
      bucket.push({ match, lead: entry.lead });
      leadsByListing.set(match.listingId, bucket);
    }
  }

  const byListing = [...leadsByListing.entries()]
    .flatMap(([listingId, matched]) => {
      const listing = briefById.get(listingId);
      return listing ? [{ listing, leads: matched.sort((a, b) => b.match.score - a.match.score) }] : [];
    })
    .sort((a, b) => b.leads.length - a.leads.length);

  return { byLead, byListing };
}
