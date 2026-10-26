import Image from "next/image";
import Link from "next/link";
import { getHome } from "@/application/public/listings";
import { getDeps } from "@/infrastructure/container";
import { pluralize } from "@/domain/shared/format";
import { cityLabel } from "@/domain/shared/locations";
import { searchHref } from "@/domain/listing/filters";
import { ListingCard } from "@/components/public/listing-card";
import { SearchForm } from "@/components/public/search-form";
import { ButtonLink } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { getVisitorContext, loginHrefFor } from "./visitor";

export default async function HomePage() {
  const [home, visitor] = await Promise.all([getHome(getDeps()), getVisitorContext()]);

  return (
    <>
      <section className="relative isolate">
        <div className="absolute inset-0 -z-10 bg-primary">
          {home.agency.heroImageUrl && (
            <Image src={home.agency.heroImageUrl} alt="" fill priority sizes="100vw" className="object-cover opacity-45" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-primary via-primary/60 to-primary/30" />
        </div>

        <div className="mx-auto max-w-[1200px] px-space-md pb-space-xl pt-space-xl lg:px-gutter-desktop lg:pt-[96px]">
          <h1 className="max-w-2xl font-display text-[32px] font-semibold leading-tight tracking-tight text-on-primary md:text-[44px]">
            Trouvez le bien qui vous ressemble, de La Marsa à Hammamet.
          </h1>
          <p className="mt-space-sm max-w-xl font-body-lg text-body-lg text-on-primary/80">
            Annonces vérifiées par nos agents, mises à jour en temps réel. Contactez-nous directement par téléphone ou WhatsApp.
          </p>
          <div className="mt-space-lg max-w-4xl">
            <SearchForm filters={{}} variant="hero" />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1200px] px-space-md py-space-xl lg:px-gutter-desktop">
        <div className="mb-space-lg flex items-end justify-between gap-space-md">
          <div>
            <h2 className="font-display text-[24px] font-semibold text-on-surface">Dernières annonces</h2>
            <p className="font-body-md text-body-md text-on-surface-variant">Publiées ces derniers jours par nos agents.</p>
          </div>
          <Link href="/annonces" className="inline-flex items-center gap-1 font-label-md text-label-md text-primary hover:underline">
            Tout voir
            <Icon name="arrow_forward" className="text-[18px]" />
          </Link>
        </div>

        <div className="grid gap-space-lg sm:grid-cols-2 lg:grid-cols-3">
          {home.featured.map((listing) => (
            <ListingCard
              key={listing.id}
              listing={listing}
              isFavorite={visitor.favoriteIds.has(listing.id)}
              loginHref={loginHrefFor(visitor, "/")}
              showFavorite={visitor.canFavorite}
            />
          ))}
        </div>
      </section>

      <section className="bg-surface-container-low py-space-xl">
        <div className="mx-auto max-w-[1200px] px-space-md lg:px-gutter-desktop">
          <h2 className="font-display text-[24px] font-semibold text-on-surface">Explorer par ville</h2>
          <ul className="mt-space-lg grid gap-space-sm sm:grid-cols-2 lg:grid-cols-4">
            {home.cities.map((city) => (
              <li key={city.cityId}>
                <Link
                  href={searchHref({ cityId: city.cityId })}
                  className="flex items-center justify-between rounded-xl bg-surface-container-lowest px-space-md py-space-md shadow-sm transition-shadow hover:shadow-md"
                >
                  <span className="font-headline-sm text-headline-sm text-on-surface">{cityLabel(city.cityId)}</span>
                  <span className="font-label-md text-label-md text-on-surface-variant">{pluralize(city.count, "bien")}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mx-auto max-w-[1200px] px-space-md py-space-xl lg:px-gutter-desktop">
        <div className="flex flex-col items-start gap-space-md rounded-2xl bg-secondary-container/40 p-space-lg md:flex-row md:items-center md:justify-between">
          <div className="max-w-xl">
            <h2 className="font-display text-[22px] font-semibold text-on-surface">Ne ratez plus aucun nouveau bien</h2>
            <p className="mt-1 font-body-md text-body-md text-on-surface-variant">
              Enregistrez votre recherche : nous vous prévenons sur WhatsApp dès qu’un bien correspondant est publié.
            </p>
          </div>
          <ButtonLink href={visitor.session ? "/annonces" : "/inscription"} variant="whatsapp" size="lg">
            <Icon name="notifications_active" className="text-[22px]" />
            {visitor.session ? "Lancer une recherche" : "Créer une alerte"}
          </ButtonLink>
        </div>
      </section>
    </>
  );
}
