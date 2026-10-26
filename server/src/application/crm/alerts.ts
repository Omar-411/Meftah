import { matchesFilters } from "../../domain/listing/filters";
import { formatAmount } from "../../domain/shared/format";
import { newId } from "../../domain/shared/id";
import type { PublicListing } from "../../domain/listing/listing";
import type { Deps } from "../ports";

/**
 * Called when a listing becomes public. Sends a WhatsApp alert to every saved search that matches.
 * In production the backend owns this; the frontend keeps it so the mock demo behaves like the real flow.
 */
export async function dispatchSavedSearchAlerts(
  deps: Pick<Deps, "accounts" | "alerts" | "agency">,
  listing: PublicListing,
  now: Date,
): Promise<number> {
  const agency = await deps.agency.get();
  if (!agency.whatsappAlertsEnabled) return 0;

  const searches = await deps.accounts.listAllSavedSearches();
  const matching = searches.filter((search) => search.whatsappAlerts && matchesFilters(listing, search.filters));

  for (const search of matching) {
    const price = listing.price === null ? "Prix sur demande" : `${formatAmount(listing.price)} TND`;
    const message = `Nouvelle annonce pour votre recherche « ${search.name} » : ${listing.title} (${listing.locationLabel}) – ${price}. /annonces/${listing.slug}`;
    await deps.alerts.sendWhatsapp({ to: search.whatsappPhone, text: message });
    await deps.accounts.recordAlert({
      id: newId("alr"),
      userId: search.userId,
      savedSearchId: search.id,
      listingId: listing.id,
      listingTitle: listing.title,
      listingSlug: listing.slug,
      channel: "whatsapp",
      message,
      sentAt: now.toISOString(),
    });
  }
  return matching.length;
}
