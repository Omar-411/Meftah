import { scopeOf } from "@/domain/auth/session";
import type { Session } from "@/domain/auth/session";
import type { ListingStatus, Visibility } from "@/domain/listing/catalog";
import { isPubliclyVisible, toPublicListing, validateListing, type Listing } from "@/domain/listing/listing";
import { slugify } from "@/domain/shared/format";
import { newId } from "@/domain/shared/id";
import { fail, ok, type Result } from "@/domain/shared/result";
import { NotFoundError } from "../errors";
import { assertCanAccess, requireStaff } from "../guards";
import type { CrmListingQuery, Deps } from "../ports";
import { dispatchSavedSearchAlerts } from "./alerts";

type ListingDeps = Pick<Deps, "listings" | "agents" | "agency" | "accounts" | "alerts">;

export async function listCrmListings(deps: Pick<Deps, "listings">, session: Session | null, query: CrmListingQuery): Promise<Listing[]> {
  const staff = requireStaff(session);
  return deps.listings.list(scopeOf(staff), query);
}

export async function getListingForEdit(deps: Pick<Deps, "listings">, session: Session | null, ref: string): Promise<Listing> {
  const staff = requireStaff(session);
  const listing = await deps.listings.findByRef(ref);
  if (!listing) throw new NotFoundError("Bien introuvable.");
  assertCanAccess(scopeOf(staff), listing.agentId);
  return listing;
}

/** A blank draft, pre-assigned to the current staff member. Not persisted until saved. */
export async function newListingDraft(deps: Pick<Deps, "agency" | "agents">, session: Session | null, now: Date): Promise<Listing> {
  const staff = requireStaff(session);
  const [agency, agent] = await Promise.all([deps.agency.get(), deps.agents.findById(staff.userId)]);
  const timestamp = now.toISOString();
  return {
    id: "",
    ref: "",
    slug: "",
    agencyId: agency.id,
    agentId: staff.userId,
    transaction: "sale",
    propertyType: "apartment",
    status: "available",
    visibility: "draft",
    title: "",
    description: "",
    price: 0,
    hidePrice: false,
    condoFees: 0,
    titleDeed: "Titre foncier individuel",
    cityId: "la-marsa",
    district: "",
    address: "",
    hideExactAddress: true,
    builtArea: 0,
    terraceArea: 0,
    rooms: 2,
    bedrooms: 2,
    bathrooms: 1,
    floorDescription: "",
    amenityIds: [],
    photos: [],
    internal: {
      ownerName: "",
      ownerPhone: "",
      notes: "",
      commissionRate: agent?.defaultCommissionRate ?? 3,
      mandateType: "exclusive",
      mandateNumber: "",
      mandateExpiry: "",
      keysLocation: "",
    },
    createdAt: timestamp,
    updatedAt: timestamp,
    publishedAt: null,
  };
}

/** Creates (empty id) or updates a listing. Going live triggers saved-search alerts. */
export async function saveListing(deps: ListingDeps, session: Session | null, draft: Listing, now: Date): Promise<Result<Listing>> {
  const staff = requireStaff(session);
  const scope = scopeOf(staff);
  const fields = validateListing(draft);
  if (Object.keys(fields).length > 0) return fail("Corrigez les champs signalés.", fields);

  const existing = draft.id ? await deps.listings.findById(draft.id) : null;
  if (existing) assertCanAccess(scope, existing.agentId);

  const timestamp = now.toISOString();
  const ref = existing?.ref ?? (await deps.listings.nextRef());
  const wasPublic = existing ? isPubliclyVisible(existing) : false;

  const listing: Listing = {
    ...draft,
    id: existing?.id ?? newId("lst"),
    ref,
    slug: existing?.slug ?? `${slugify(draft.title)}-${ref.toLowerCase()}`,
    agentId: staff.role === "admin" ? draft.agentId : (existing?.agentId ?? staff.userId),
    createdAt: existing?.createdAt ?? timestamp,
    updatedAt: timestamp,
    publishedAt: draft.visibility === "published" ? (existing?.publishedAt ?? timestamp) : (existing?.publishedAt ?? null),
  };

  const saved = await deps.listings.save(listing);
  if (!wasPublic && isPubliclyVisible(saved)) await dispatchSavedSearchAlerts(deps, toPublicListing(saved), now);
  return ok(saved);
}

export async function setListingState(
  deps: ListingDeps,
  session: Session | null,
  id: string,
  change: { visibility?: Visibility; status?: ListingStatus },
  now: Date,
): Promise<Result<Listing>> {
  const staff = requireStaff(session);
  const existing = await deps.listings.findById(id);
  if (!existing) throw new NotFoundError("Bien introuvable.");
  assertCanAccess(scopeOf(staff), existing.agentId);
  return saveListing(deps, session, { ...existing, ...change }, now);
}

export async function deleteListing(deps: Pick<Deps, "listings">, session: Session | null, id: string): Promise<void> {
  const staff = requireStaff(session);
  const existing = await deps.listings.findById(id);
  if (!existing) throw new NotFoundError("Bien introuvable.");
  assertCanAccess(scopeOf(staff), existing.agentId);
  await deps.listings.remove(id);
}
