import type { Metadata } from "next";
import { listCrmListings } from "@/application/crm/listings";
import { getDeps } from "@/infrastructure/container";
import { NewLeadForm } from "@/components/crm/new-lead-form";
import { PageHeader } from "@/components/crm/page-header";
import { loadOrRedirect, requireStaffPage } from "../../_lib/guard";

export const metadata: Metadata = { title: "Nouveau prospect" };

export default async function NewLeadPage() {
  const session = await requireStaffPage("/crm/prospects/nouveau");
  const listings = await loadOrRedirect(() => listCrmListings(getDeps(), session, { status: "available" }));

  return (
    <>
      <PageHeader title="Nouveau prospect" subtitle="Ajoutez un contact reçu par téléphone, WhatsApp ou en agence. Il vous est assigné." />
      <div className="max-w-3xl">
        <NewLeadForm listingOptions={listings.map((listing) => ({ id: listing.id, label: `${listing.ref} · ${listing.title}` }))} />
      </div>
    </>
  );
}
