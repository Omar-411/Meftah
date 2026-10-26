import type { Metadata } from "next";
import Link from "next/link";
import { getMatchingOverview } from "@/application/crm/matching";
import { SOURCE_LABELS } from "@/domain/lead/lead";
import { formatAmount, pluralize } from "@/domain/shared/format";
import { getDeps } from "@/infrastructure/container";
import { ListingThumb } from "@/components/crm/listing-thumb";
import { PageHeader } from "@/components/crm/page-header";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/cn";
import { loadOrRedirect, requireStaffPage } from "../_lib/guard";

export const metadata: Metadata = { title: "Rapprochement" };

type SearchParams = Promise<{ vue?: string }>;

export default async function MatchingPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await requireStaffPage("/crm/rapprochement");
  const { vue } = await searchParams;
  const view = vue === "biens" ? "listings" : "leads";
  const overview = await loadOrRedirect(() => getMatchingOverview(getDeps(), session));

  const tab = (value: "leads" | "listings", label: string, href: string) => (
    <Link href={href} aria-current={view === value ? "page" : undefined} className={cn("rounded-md px-space-md py-1.5 font-label-md text-label-md", view === value ? "bg-surface-container-lowest font-semibold text-primary shadow-sm" : "text-on-surface-variant hover:text-on-surface")}>
      {label}
    </Link>
  );

  return (
    <>
      <PageHeader
        title="Rapprochement"
        subtitle="Les biens en ligne qui correspondent aux critères de vos prospects ouverts."
        actions={
          <div className="inline-flex rounded-lg bg-surface-container-low p-1">
            {tab("leads", "Par prospect", "/crm/rapprochement")}
            {tab("listings", "Par bien", "/crm/rapprochement?vue=biens")}
          </div>
        }
      />

      {overview.byLead.length === 0 ? (
        <EmptyState icon="join_inner" title="Aucune correspondance pour le moment" description="Renseignez les critères de recherche de vos prospects (budget, ville, type de bien) pour voir apparaître des suggestions." />
      ) : view === "leads" ? (
        <ul className="space-y-space-md">
          {overview.byLead.map(({ lead, matches }) => (
            <li key={lead.id} className="rounded-xl bg-surface-container-lowest p-space-md shadow-sm">
              <div className="mb-space-sm flex flex-wrap items-baseline justify-between gap-space-sm">
                <Link href={`/crm/prospects/${lead.id}`} className="font-headline-sm text-headline-sm text-primary hover:underline">{lead.fullName}</Link>
                <span className="font-label-sm text-label-sm text-on-surface-variant">{SOURCE_LABELS[lead.source]} · {pluralize(matches.length, "bien suggéré", "biens suggérés")}</span>
              </div>
              <ul className="grid gap-space-sm md:grid-cols-2 lg:grid-cols-3">
                {matches.slice(0, 3).map(({ match, listing }) => (
                  <li key={listing.id}>
                    <Link href={`/crm/biens/${listing.ref}/modifier`} className="flex items-center gap-space-sm rounded-lg bg-surface-container-low p-space-sm hover:bg-surface-container-high">
                      <ListingThumb url={listing.photoUrl} alt={listing.photoAlt} className="h-12 w-16" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-label-md text-label-md font-semibold text-on-surface">{listing.title}</span>
                        <span className="block truncate font-label-sm text-label-sm text-on-surface-variant">{formatAmount(listing.price)} TND</span>
                      </span>
                      <Badge tone={match.score >= 80 ? "success" : "info"}>{match.score}%</Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      ) : (
        <ul className="space-y-space-md">
          {overview.byListing.map(({ listing, leads }) => (
            <li key={listing.id} className="rounded-xl bg-surface-container-lowest p-space-md shadow-sm">
              <Link href={`/crm/biens/${listing.ref}/modifier`} className="mb-space-sm flex items-center gap-space-sm hover:underline">
                <ListingThumb url={listing.photoUrl} alt={listing.photoAlt} />
                <span className="min-w-0">
                  <span className="block truncate font-headline-sm text-headline-sm text-primary">{listing.title}</span>
                  <span className="block font-label-sm text-label-sm text-on-surface-variant">{listing.ref} · {formatAmount(listing.price)} TND · {pluralize(leads.length, "prospect intéressé", "prospects intéressés")}</span>
                </span>
              </Link>
              <ul className="flex flex-wrap gap-space-sm">
                {leads.map(({ lead, match }) => (
                  <li key={lead.id}>
                    <Link href={`/crm/prospects/${lead.id}`} className="inline-flex items-center gap-1.5 rounded-full bg-surface-container-low px-space-md py-1 font-label-md text-label-md text-on-surface hover:bg-surface-container-high">
                      {lead.fullName}
                      <Badge tone={match.score >= 80 ? "success" : "info"}>{match.score}%</Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
