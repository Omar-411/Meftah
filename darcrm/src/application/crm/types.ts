import type { Listing } from "@/domain/listing/listing";
import { cityLabel } from "@/domain/shared/locations";
import type { TransactionType } from "@/domain/listing/catalog";

/** Minimal listing info for lists and links; contains nothing owner-related. */
export interface ListingBrief {
  readonly id: string;
  readonly ref: string;
  readonly title: string;
  readonly price: number;
  readonly transaction: TransactionType;
  readonly cityLabel: string;
  readonly district: string;
  readonly rooms: number;
  readonly builtArea: number;
  readonly photoUrl: string | null;
  readonly photoAlt: string;
  readonly agentId: string;
}

export function toListingBrief(listing: Listing): ListingBrief {
  const cover = listing.photos[0];
  return {
    id: listing.id,
    ref: listing.ref,
    title: listing.title,
    price: listing.price,
    transaction: listing.transaction,
    cityLabel: cityLabel(listing.cityId),
    district: listing.district,
    rooms: listing.rooms,
    builtArea: listing.builtArea,
    photoUrl: cover?.url ?? null,
    photoAlt: cover?.alt ?? listing.title,
    agentId: listing.agentId,
  };
}
