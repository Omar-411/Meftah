import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getAccountOverview } from "@/application/account/account";
import { isStaff } from "@/domain/auth/session";
import { formatRelativeFr } from "@/domain/shared/format";
import { getDeps } from "@/infrastructure/container";
import { readSession } from "@/infrastructure/session";
import { ListingCard } from "@/components/public/listing-card";
import { SavedSearchCard } from "@/components/public/saved-search-card";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Icon } from "@/components/ui/icon";

export const metadata: Metadata = { title: "Mon compte · DarCRM" };

export default async function AccountPage() {
  const session = await readSession();
  if (!session) redirect("/connexion?next=/compte");
  if (isStaff(session)) redirect("/crm");

  const deps = getDeps();
  const [overview, agency] = await Promise.all([getAccountOverview(deps, session), deps.agency.get()]);
  const now = new Date();

  return (
    <div className="mx-auto max-w-[1200px] px-space-md py-space-lg lg:px-gutter-desktop">
      <h1 className="font-display text-[28px] font-semibold text-on-surface">Bonjour {session.displayName.split(" ")[0]}</h1>
      <p className="font-body-md text-body-md text-on-surface-variant">Vos biens enregistrés, vos recherches et vos alertes.</p>
      <ButtonLink href="/compte/profil" variant="secondary" size="sm" className="mt-space-sm">
        <Icon name="manage_accounts" className="text-[18px]" />
        Modifier mon profil
      </ButtonLink>

      <section aria-labelledby="favorites" className="mt-space-xl">
        <h2 id="favorites" className="mb-space-md font-display text-[20px] font-semibold text-on-surface">Mes favoris</h2>
        {overview.favorites.length === 0 ? (
          <EmptyState
            icon="favorite"
            title="Aucun favori pour l'instant"
            description="Touchez le cœur sur une annonce pour la retrouver ici."
            action={<ButtonLink href="/annonces">Parcourir les annonces</ButtonLink>}
          />
        ) : (
          <div className="grid gap-space-lg sm:grid-cols-2 lg:grid-cols-3">
            {overview.favorites.map((listing) => (
              <ListingCard key={listing.id} listing={listing} isFavorite loginHref={null} showFavorite />
            ))}
          </div>
        )}
      </section>

      <div className="mt-space-xl grid gap-space-xl lg:grid-cols-2">
        <section aria-labelledby="searches">
          <h2 id="searches" className="mb-space-md font-display text-[20px] font-semibold text-on-surface">Mes recherches</h2>
          {overview.savedSearches.length === 0 ? (
            <EmptyState
              icon="saved_search"
              title="Aucune recherche enregistrée"
              description="Filtrez les annonces puis choisissez « Enregistrer cette recherche » pour activer les alertes WhatsApp."
            />
          ) : (
            <ul className="space-y-space-md">
              {overview.savedSearches.map((search) => (
                <SavedSearchCard key={search.id} search={search} alertsEnabled={agency.whatsappAlertsEnabled} />
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="alerts">
          <h2 id="alerts" className="mb-space-md font-display text-[20px] font-semibold text-on-surface">Alertes reçues</h2>
          {overview.alerts.length === 0 ? (
            <EmptyState icon="notifications" title="Pas encore d'alerte" description="Dès qu'un nouveau bien correspond à une de vos recherches, il apparaît ici et vous est envoyé sur WhatsApp." />
          ) : (
            <ul className="space-y-space-sm">
              {overview.alerts.map((alert) => (
                <li key={alert.id} className="flex items-start gap-space-sm rounded-xl bg-surface-container-lowest p-space-md shadow-sm">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary-container text-on-secondary-container">
                    <Icon name="chat" className="text-[20px]" />
                  </span>
                  <div className="min-w-0">
                    <p className="font-body-md text-body-md text-on-surface">{alert.message}</p>
                    <p className="mt-1 font-label-sm text-label-sm text-on-surface-variant">
                      {formatRelativeFr(new Date(alert.sentAt), now)} ·{" "}
                      <Link href={`/annonces/${alert.listingSlug}`} className="text-primary hover:underline">Voir le bien</Link>
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
