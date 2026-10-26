import Image from "next/image";
import Link from "next/link";
import { roomsLabel, PROPERTY_TYPE_LABELS, TRANSACTION_LABELS } from "@/domain/listing/catalog";
import type { PublicListing } from "@/domain/listing/listing";
import { Amount } from "@/components/ui/amount";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";
import { FavoriteButton } from "./favorite-button";

interface ListingCardProps {
  listing: PublicListing;
  isFavorite: boolean;
  /** Where to send an anonymous visitor who taps the heart; null when signed in as a visitor. */
  loginHref: string | null;
  /** Staff can't hold favorites, so the heart is hidden for them. */
  showFavorite: boolean;
}

export function ListingCard({ listing, isFavorite, loginHref, showFavorite }: ListingCardProps) {
  const cover = listing.photos[0];
  const rentSuffix = listing.transaction === "rent" ? " / mois" : "";

  return (
    <article className="group relative overflow-hidden rounded-xl bg-surface-container-lowest shadow-sm transition-shadow hover:shadow-md">
      <div className="relative aspect-[4/3] bg-surface-container-high">
        {cover && (
          <Image
            src={cover.url}
            alt={cover.alt || listing.title}
            fill
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        )}
        <div className="absolute left-space-sm top-space-sm flex gap-1.5">
          <Badge tone="info" className="bg-surface-container-lowest/95">
            {TRANSACTION_LABELS[listing.transaction]}
          </Badge>
        </div>
        {showFavorite && (
          <FavoriteButton listingId={listing.id} initial={isFavorite} loginHref={loginHref} className="absolute right-space-sm top-space-sm z-10" />
        )}
      </div>

      <div className="p-space-md">
        <p className="font-currency-display text-currency-display text-primary">
          {listing.price === null ? (
            <span className="font-headline-sm text-headline-sm">Prix sur demande</span>
          ) : (
            <>
              <Amount value={listing.price} className="text-primary" />
              <span className="font-label-sm text-label-sm font-normal text-on-surface-variant">{rentSuffix}</span>
            </>
          )}
        </p>

        <h3 className="mt-1 line-clamp-2 font-headline-sm text-headline-sm text-on-surface">
          {/* The stretched link makes the whole card clickable while keeping the heart button usable. */}
          <Link href={`/annonces/${listing.slug}`} className="after:absolute after:inset-0 after:content-['']">
            {listing.title}
          </Link>
        </h3>

        <p className="mt-1 flex items-center gap-1 font-body-sm text-body-sm text-on-surface-variant">
          <Icon name="location_on" className="text-[16px]" />
          <span className="truncate">{listing.locationLabel}</span>
        </p>

        <ul className="mt-space-md flex flex-wrap items-center gap-x-space-md gap-y-1 border-t border-outline-variant/40 pt-space-md font-label-md text-label-md text-on-surface-variant">
          <li className="flex items-center gap-1">
            <Icon name="home_work" className="text-[18px]" />
            {PROPERTY_TYPE_LABELS[listing.propertyType]}
          </li>
          {listing.rooms > 0 && (
            <li className="flex items-center gap-1">
              <Icon name="bed" className="text-[18px]" />
              {roomsLabel(listing.rooms)}
            </li>
          )}
          {listing.builtArea > 0 && (
            <li className="flex items-center gap-1">
              <Icon name="square_foot" className="text-[18px]" />
              {listing.builtArea} m²
            </li>
          )}
        </ul>
      </div>
    </article>
  );
}
