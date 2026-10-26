import type { Metadata } from "next";
import { listAgentOptions } from "@/application/crm/admin";
import { newListingDraft } from "@/application/crm/listings";
import { getDeps } from "@/infrastructure/container";
import { ListingForm } from "@/components/crm/listing-form";
import { PageHeader } from "@/components/crm/page-header";
import { loadOrRedirect, requireStaffPage } from "../../_lib/guard";

export const metadata: Metadata = { title: "Nouveau bien" };

export default async function NewListingPage() {
  const session = await requireStaffPage("/crm/biens/nouveau");
  const deps = getDeps();
  const [draft, agents] = await loadOrRedirect(() => Promise.all([newListingDraft(deps, session, new Date()), listAgentOptions(deps, session)]));
  const agentOptions = session.role === "admin" ? agents.map((agent) => ({ id: agent.id, label: agent.fullName })) : [];

  return (
    <>
      <PageHeader title="Nouveau bien" subtitle="Enregistrez d'abord en brouillon, publiez quand l'annonce est prête." />
      <ListingForm initial={draft} agentOptions={agentOptions} />
    </>
  );
}
