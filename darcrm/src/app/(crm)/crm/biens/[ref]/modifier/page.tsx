import type { Metadata } from "next";
import { listAgentOptions } from "@/application/crm/admin";
import { getListingForEdit } from "@/application/crm/listings";
import { getDeps } from "@/infrastructure/container";
import { ListingForm } from "@/components/crm/listing-form";
import { PageHeader } from "@/components/crm/page-header";
import { loadOrRedirect, requireStaffPage } from "../../../_lib/guard";

export const metadata: Metadata = { title: "Modifier le bien" };

type Props = { params: Promise<{ ref: string }>; searchParams: Promise<{ cree?: string }> };

export default async function EditListingPage({ params, searchParams }: Props) {
  const [{ ref }, { cree }] = await Promise.all([params, searchParams]);
  const session = await requireStaffPage(`/crm/biens/${ref}/modifier`);
  const deps = getDeps();
  const [listing, agents] = await loadOrRedirect(() => Promise.all([getListingForEdit(deps, session, ref), listAgentOptions(deps, session)]));
  const agentOptions = session.role === "admin" ? agents.map((agent) => ({ id: agent.id, label: agent.fullName })) : [];

  return (
    <>
      <PageHeader
        title={listing.title || listing.ref}
        subtitle={cree ? `Bien ${listing.ref} créé. Complétez l'annonce puis publiez-la.` : `Réf. ${listing.ref}`}
      />
      <ListingForm key={listing.updatedAt} initial={listing} agentOptions={agentOptions} />
    </>
  );
}
