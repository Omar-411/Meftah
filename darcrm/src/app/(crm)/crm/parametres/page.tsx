import type { Metadata } from "next";
import { getAgencySettings } from "@/application/crm/admin";
import { listTemplates } from "@/application/crm/templates";
import { getDeps } from "@/infrastructure/container";
import { PageHeader } from "@/components/crm/page-header";
import { TemplateEditor } from "@/components/crm/template-editor";
import { SectionCard } from "@/components/ui/form";
import { SettingsForm } from "@/components/crm/settings-form";
import { loadOrRedirect, requireAdminPage } from "../_lib/guard";

export const metadata: Metadata = { title: "Paramètres" };

export default async function SettingsPage() {
  const session = await requireAdminPage();
  const deps = getDeps();
  const [agency, templates] = await loadOrRedirect(() => Promise.all([Promise.resolve(getAgencySettings(deps, session)), listTemplates(deps, session)]));
  return (
    <>
      <PageHeader title="Paramètres" subtitle="Réservé aux administrateurs." />
      <SettingsForm agency={agency} />
      <div className="mt-space-lg max-w-3xl">
        <SectionCard icon="chat" title="Modèles de messages WhatsApp" subtitle="Proposés aux agents sur chaque fiche prospect. Les variables entre accolades sont remplacées automatiquement.">
          <TemplateEditor templates={templates} />
        </SectionCard>
      </div>
    </>
  );
}
