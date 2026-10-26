import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getListingDetail } from "@/application/public/listings";
import { NotFoundError } from "@/application/errors";
import { findAmenity, PROPERTY_TYPE_LABELS, roomsLabel, TRANSACTION_LABELS } from "@/domain/listing/catalog";
import { pricePerSqm } from "@/domain/listing/listing";
import { formatAmount, telLink, whatsappLink } from "@/domain/shared/format";
import { getDeps } from "@/infrastructure/container";
import { Gallery } from "@/components/public/gallery";
import { InquiryForm } from "@/components/public/inquiry-form";
import { FavoriteButton } from "@/components/public/favorite-button";
import { ListingCard } from "@/components/public/listing-card";
import { Amount } from "@/components/ui/amount";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { getVisitorContext, loginHrefFor } from "../../visitor";

type Params = Promise<{ slug: string }>;

async function loadDetail(slug: string, userId: string | null) {
  try {
    return await getListingDetail(getDeps(), slug, userId);
  } catch (error) {
    if (error instanceof NotFoundError) notFound();
    throw error;
  }
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  try {
    const { listing } = await getListingDetail(getDeps(), slug, null);
    return { title: `${listing.title} · DarCRM`, description: listing.description.slice(0, 155) };
  } catch {
    return { title: "Annonce introuvable · DarCRM" };
  }
}

export default async function ListingDetailPage({ params }: { params: Params }) {
  const { slug } = await params;
  const visitor = await getVisitorContext();
  const { listing, agent, similar, isFavorite } = await loadDetail(slug, visitor.session?.role === "user" ? visitor.session.userId : null);

  const returnTo = `/annonces/${listing.slug}`;
  const perSqm = pricePerSqm(listing);
  const rentSuffix = listing.transaction === "rent" ? " / mois" : "";
  const interest = `Bonjour, je suis intéressé(e) par ${listing.ref} — ${listing.title}`;

  const facts: ReadonlyArray<{ icon: string; label: string; value: string }> = [
    { icon: "home_work", label: "Type", value: PROPERTY_TYPE_LABELS[listing.propertyType] },
    ...(listing.rooms > 0 ? [{ icon: "bed", label: "Pièces", value: roomsLabel(listing.rooms) }] : []),
    ...(listing.bathrooms > 0 ? [{ icon: "bathtub", label: "Salles de bain", value: String(listing.bathrooms) }] : []),
    ...(listing.builtArea > 0 ? [{ icon: "square_foot", label: "Surface couverte", value: `${listing.builtArea} m²` }] : []),
    ...(listing.terraceArea > 0 ? [{ icon: "deck", label: "Terrasse", value: `${listing.terraceArea} m²` }] : []),
    ...(listing.floorDescription ? [{ icon: "stairs", label: "Étage", value: listing.floorDescription }] : []),
    ...(listing.titleDeed ? [{ icon: "description", label: "Titre", value: listing.titleDeed }] : []),
    ...(listing.condoFees > 0 ? [{ icon: "payments", label: "Charges", value: `${formatAmount(listing.condoFees)} TND / mois` }] : []),
  ];

  return (
    <div className="mx-auto max-w-[1200px] px-space-md py-space-lg lg:px-gutter-desktop">
      <nav aria-label="Fil d'Ariane" className="mb-space-md flex items-center gap-1 font-body-sm text-body-sm text-on-surface-variant">
        <Link href="/annonces" className="hover:text-primary">Annonces</Link>
        <Icon name="chevron_right" className="text-[16px]" />
        <Link href={`/annonces?ville=${listing.cityId}`} className="hover:text-primary">{listing.cityLabel}</Link>
      </nav>

      <div className="grid gap-space-xl lg:grid-cols-[1fr_360px]">
        <div className="min-w-0">
          <Gallery photos={listing.photos} title={listing.title} />

          <header className="mt-space-lg">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="info">{TRANSACTION_LABELS[listing.transaction]}</Badge>
              <Badge tone="neutral">Réf. {listing.ref}</Badge>
            </div>
            <h1 className="mt-space-sm font-display text-[26px] font-semibold leading-tight text-on-surface md:text-[30px]">{listing.title}</h1>
            <p className="mt-1 flex items-center gap-1 font-body-md text-body-md text-on-surface-variant">
              <Icon name="location_on" className="text-[18px]" />
              {listing.locationLabel}
            </p>
          </header>

          <section aria-labelledby="facts" className="mt-space-lg">
            <h2 id="facts" className="sr-only">Caractéristiques</h2>
            <dl className="grid grid-cols-2 gap-space-sm md:grid-cols-4">
              {facts.map((fact) => (
                <div key={fact.label} className="rounded-xl bg-surface-container-lowest p-space-md shadow-sm">
                  <dt className="flex items-center gap-1 font-label-sm text-label-sm text-on-surface-variant">
                    <Icon name={fact.icon} className="text-[16px]" />
                    {fact.label}
                  </dt>
                  <dd className="mt-1 font-headline-sm text-headline-sm text-on-surface">{fact.value}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section aria-labelledby="description" className="mt-space-xl">
            <h2 id="description" className="font-display text-[20px] font-semibold text-on-surface">Description</h2>
            <p className="mt-space-sm max-w-[68ch] whitespace-pre-line font-body-lg text-body-lg leading-relaxed text-on-surface-variant">{listing.description}</p>
          </section>

          {listing.amenityIds.length > 0 && (
            <section aria-labelledby="amenities" className="mt-space-xl">
              <h2 id="amenities" className="font-display text-[20px] font-semibold text-on-surface">Équipements</h2>
              <ul className="mt-space-sm grid gap-space-sm sm:grid-cols-2 md:grid-cols-3">
                {listing.amenityIds.map((id) => {
                  const amenity = findAmenity(id);
                  return amenity ? (
                    <li key={id} className="flex items-center gap-2 font-body-md text-body-md text-on-surface">
                      <Icon name={amenity.icon} className="text-[20px] text-primary" />
                      {amenity.label}
                    </li>
                  ) : null;
                })}
              </ul>
            </section>
          )}
        </div>

        <aside className="lg:sticky lg:top-[88px] lg:self-start">
          <div className="rounded-2xl bg-surface-container-lowest p-space-lg shadow-md">
            <div className="flex items-start justify-between gap-space-sm">
              <div>
                {listing.price === null ? (
                  <p className="font-headline-sm text-headline-sm text-on-surface">Prix sur demande</p>
                ) : (
                  <p className="text-primary">
                    <Amount value={listing.price} className="text-[28px] leading-none" />
                    <span className="font-label-md text-label-md text-on-surface-variant">{rentSuffix}</span>
                  </p>
                )}
                {perSqm !== null && <p className="mt-1 font-label-sm text-label-sm text-on-surface-variant">{formatAmount(perSqm)} TND / m²</p>}
              </div>
              {visitor.canFavorite && (
                <FavoriteButton listingId={listing.id} initial={isFavorite} loginHref={loginHrefFor(visitor, returnTo)} className="border border-outline-variant" />
              )}
            </div>

            <div className="mt-space-md flex items-center gap-space-sm border-t border-outline-variant/40 pt-space-md">
              <Avatar name={agent.fullName} url={agent.avatarUrl} size={44} />
              <div>
                <p className="font-headline-sm text-headline-sm text-on-surface">{agent.fullName}</p>
                <p className="font-body-sm text-body-sm text-on-surface-variant">{agent.jobTitle}</p>
              </div>
            </div>

            <div className="mt-space-md grid grid-cols-2 gap-space-sm">
              <ButtonLink href={telLink(agent.phone)} variant="secondary">
                <Icon name="call" className="text-[18px]" />
                Appeler
              </ButtonLink>
              <ButtonLink href={whatsappLink(agent.whatsapp, interest)} variant="whatsapp">
                <Icon name="chat" className="text-[18px]" />
                WhatsApp
              </ButtonLink>
            </div>

            <div className="mt-space-lg border-t border-outline-variant/40 pt-space-lg">
              <h2 className="mb-space-md font-headline-sm text-headline-sm text-on-surface">Être rappelé</h2>
              <InquiryForm slug={listing.slug} listingRef={listing.ref} defaultName={visitor.session?.role === "user" ? visitor.session.displayName : undefined} />
            </div>
          </div>
        </aside>
      </div>

      {similar.length > 0 && (
        <section aria-labelledby="similar" className="mt-space-xl">
          <h2 id="similar" className="font-display text-[22px] font-semibold text-on-surface">Biens similaires</h2>
          <div className="mt-space-md grid gap-space-lg sm:grid-cols-2 lg:grid-cols-3">
            {similar.map((item) => (
              <ListingCard
                key={item.id}
                listing={item}
                isFavorite={visitor.favoriteIds.has(item.id)}
                loginHref={loginHrefFor(visitor, returnTo)}
                showFavorite={visitor.canFavorite}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
