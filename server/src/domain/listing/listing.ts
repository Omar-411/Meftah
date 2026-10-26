import type { ListingStatus, MandateType, PropertyType, TransactionType, Visibility } from "./catalog";
import { cityLabel } from "../shared/locations";

export interface ListingPhoto {
  readonly id: string;
  readonly fileName: string;
  readonly url: string;
  readonly alt: string;
}

/** Agency-only data. Never leaves the CRM: see toPublicListing. */
export interface ListingInternal {
  readonly ownerName: string;
  readonly ownerPhone: string;
  readonly notes: string;
  readonly commissionRate: number;
  readonly mandateType: MandateType;
  readonly mandateNumber: string;
  readonly mandateExpiry: string;
  readonly keysLocation: string;
}

export interface Listing {
  readonly id: string;
  readonly ref: string;
  readonly slug: string;
  readonly agencyId: string;
  readonly agentId: string;

  readonly transaction: TransactionType;
  readonly propertyType: PropertyType;
  readonly status: ListingStatus;
  readonly visibility: Visibility;

  readonly title: string;
  readonly description: string;
  readonly price: number;
  readonly hidePrice: boolean;
  readonly condoFees: number;
  readonly titleDeed: string;

  readonly cityId: string;
  readonly district: string;
  readonly address: string;
  readonly hideExactAddress: boolean;

  readonly builtArea: number;
  readonly terraceArea: number;
  readonly rooms: number;
  readonly bedrooms: number;
  readonly bathrooms: number;
  readonly floorDescription: string;

  readonly amenityIds: readonly string[];
  readonly photos: readonly ListingPhoto[];
  readonly internal: ListingInternal;

  readonly createdAt: string;
  readonly updatedAt: string;
  readonly publishedAt: string | null;
}

export const AD_TITLE_MAX_LENGTH = 100;
export const MAX_PHOTOS = 20;

export function isPubliclyVisible(listing: Pick<Listing, "visibility" | "status">): boolean {
  return listing.visibility === "published" && listing.status === "available";
}

/**
 * What a visitor may see. Built by whitelisting fields so internal data can never leak by accident:
 * no owner, notes, commission, mandate, keys, and no street address when the agent hid it.
 */
export interface PublicListing {
  readonly id: string;
  readonly ref: string;
  readonly slug: string;
  readonly agentId: string;
  readonly transaction: TransactionType;
  readonly propertyType: PropertyType;
  readonly title: string;
  readonly description: string;
  readonly price: number | null;
  readonly cityId: string;
  readonly cityLabel: string;
  readonly locationLabel: string;
  readonly builtArea: number;
  readonly terraceArea: number;
  readonly rooms: number;
  readonly bedrooms: number;
  readonly bathrooms: number;
  readonly floorDescription: string;
  readonly titleDeed: string;
  readonly condoFees: number;
  readonly amenityIds: readonly string[];
  readonly photos: readonly ListingPhoto[];
  readonly publishedAt: string;
}

export function toPublicListing(listing: Listing): PublicListing {
  const place = listing.hideExactAddress ? listing.district : `${listing.address}, ${listing.district}`;
  return {
    id: listing.id,
    ref: listing.ref,
    slug: listing.slug,
    agentId: listing.agentId,
    transaction: listing.transaction,
    propertyType: listing.propertyType,
    title: listing.title,
    description: listing.description,
    price: listing.hidePrice ? null : listing.price,
    cityId: listing.cityId,
    cityLabel: cityLabel(listing.cityId),
    locationLabel: `${place}, ${cityLabel(listing.cityId)}`,
    builtArea: listing.builtArea,
    terraceArea: listing.terraceArea,
    rooms: listing.rooms,
    bedrooms: listing.bedrooms,
    bathrooms: listing.bathrooms,
    floorDescription: listing.floorDescription,
    titleDeed: listing.titleDeed,
    condoFees: listing.condoFees,
    amenityIds: listing.amenityIds,
    photos: listing.photos,
    publishedAt: listing.publishedAt ?? listing.updatedAt,
  };
}

export function pricePerSqm(listing: { price: number | null; builtArea: number; transaction: TransactionType }): number | null {
  if (listing.transaction !== "sale" || listing.price === null || listing.builtArea <= 0) return null;
  return Math.round(listing.price / listing.builtArea);
}

export function agencyCommission(listing: Pick<Listing, "price" | "internal">): number {
  return Math.round((listing.price * listing.internal.commissionRate) / 100);
}

export function filledInternalFieldCount(internal: ListingInternal): number {
  return [internal.ownerName, internal.ownerPhone, internal.mandateNumber, internal.mandateExpiry, internal.keysLocation, internal.notes]
    .filter((value) => value.trim().length > 0).length;
}

/** Share of listing-quality checks that pass, 0-100. */
export function completenessPercent(listing: Listing): number {
  const checks = [
    listing.title.trim().length >= 20,
    listing.description.trim().length >= 100,
    listing.photos.length >= 5,
    listing.price > 0,
    listing.builtArea > 0,
    listing.district.trim().length > 0,
    listing.bedrooms > 0,
    listing.amenityIds.length >= 3,
    listing.titleDeed.trim().length > 0,
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

export function validateListing(listing: Listing): Record<string, string> {
  const errors: Record<string, string> = {};
  if (listing.title.trim().length === 0) errors.title = "Saisissez un titre d'annonce.";
  if (listing.title.length > AD_TITLE_MAX_LENGTH) errors.title = `Le titre ne peut pas dépasser ${AD_TITLE_MAX_LENGTH} caractères.`;
  if (listing.price <= 0) errors.price = "Le prix doit être supérieur à 0.";
  if (listing.propertyType !== "land" && listing.builtArea <= 0) errors.builtArea = "Saisissez la surface couverte.";
  if (listing.district.trim().length === 0) errors.district = "Indiquez le quartier.";
  if (listing.photos.length > MAX_PHOTOS) errors.photos = `Maximum ${MAX_PHOTOS} photos.`;
  if (listing.visibility === "published" && listing.photos.length === 0) {
    errors.photos = "Ajoutez au moins une photo avant de publier.";
  }
  return errors;
}
