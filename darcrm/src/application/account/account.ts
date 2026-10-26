import type { AlertDispatch, SavedSearch } from "@/domain/account/account";
import type { ListingFilters } from "@/domain/listing/filters";
import { describeFilters, hasAnyFilter } from "@/domain/listing/filters";
import type { PublicListing } from "@/domain/listing/listing";
import { isValidTunisianPhone } from "@/domain/shared/format";
import { newId } from "@/domain/shared/id";
import { fail, ok, type Result } from "@/domain/shared/result";
import type { Session } from "@/domain/auth/session";
import { requireUser } from "../guards";
import type { Deps } from "../ports";

export interface AccountOverview {
  readonly favorites: readonly PublicListing[];
  readonly savedSearches: readonly SavedSearch[];
  readonly alerts: readonly AlertDispatch[];
  readonly phone: string;
}

export async function getAccountOverview(deps: Pick<Deps, "accounts" | "publicListings" | "users">, session: Session | null): Promise<AccountOverview> {
  const user = requireUser(session);
  const [favoriteIds, savedSearches, alerts, profile] = await Promise.all([
    deps.accounts.listFavoriteIds(user.userId),
    deps.accounts.listSavedSearches(user.userId),
    deps.accounts.listAlerts(user.userId),
    deps.users.findById(user.userId),
  ]);
  const favorites = await deps.publicListings.findByIds(favoriteIds);
  return { favorites, savedSearches, alerts, phone: profile?.phone ?? "" };
}

export async function listFavoriteIds(deps: Pick<Deps, "accounts">, session: Session | null): Promise<string[]> {
  if (!session || session.role !== "user") return [];
  return deps.accounts.listFavoriteIds(session.userId);
}

export async function setFavorite(deps: Pick<Deps, "accounts">, session: Session | null, listingId: string, favorite: boolean): Promise<void> {
  const user = requireUser(session);
  if (favorite) await deps.accounts.addFavorite(user.userId, listingId);
  else await deps.accounts.removeFavorite(user.userId, listingId);
}

export interface SaveSearchInput {
  /** Optional so the backend can honour the client-generated id (idempotent PUT). */
  readonly id?: string;
  readonly filters: ListingFilters;
  readonly whatsappAlerts: boolean;
  readonly whatsappPhone: string;
  readonly name?: string;
}

export async function saveSearch(deps: Pick<Deps, "accounts">, session: Session | null, input: SaveSearchInput, now: Date): Promise<Result<SavedSearch>> {
  const user = requireUser(session);
  if (!hasAnyFilter(input.filters)) return fail("Choisissez au moins un filtre avant d'enregistrer la recherche.");
  if (input.whatsappAlerts && !isValidTunisianPhone(input.whatsappPhone)) {
    return fail("Numéro WhatsApp invalide.", { whatsappPhone: "Numéro invalide (ex. 98 123 456)." });
  }
  const search: SavedSearch = {
    id: input.id ?? newId("srch"),
    userId: user.userId,
    name: input.name?.trim() || describeFilters(input.filters),
    filters: input.filters,
    whatsappAlerts: input.whatsappAlerts,
    whatsappPhone: input.whatsappPhone.trim(),
    createdAt: now.toISOString(),
  };
  await deps.accounts.saveSearch(search);
  return ok(search);
}

export async function updateSavedSearchAlerts(
  deps: Pick<Deps, "accounts">,
  session: Session | null,
  searchId: string,
  whatsappAlerts: boolean,
  whatsappPhone: string,
): Promise<Result<SavedSearch>> {
  const user = requireUser(session);
  if (whatsappAlerts && !isValidTunisianPhone(whatsappPhone)) {
    return fail("Numéro WhatsApp invalide.", { whatsappPhone: "Numéro invalide (ex. 98 123 456)." });
  }
  const searches = await deps.accounts.listSavedSearches(user.userId);
  const existing = searches.find((search) => search.id === searchId);
  if (!existing) return fail("Recherche introuvable.");
  const updated: SavedSearch = { ...existing, whatsappAlerts, whatsappPhone: whatsappPhone.trim() };
  await deps.accounts.saveSearch(updated);
  return ok(updated);
}

export async function deleteSavedSearch(deps: Pick<Deps, "accounts">, session: Session | null, searchId: string): Promise<void> {
  const user = requireUser(session);
  await deps.accounts.deleteSearch(user.userId, searchId);
}
