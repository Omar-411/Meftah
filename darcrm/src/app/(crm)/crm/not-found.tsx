import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export default function CrmNotFound() {
  return (
    <div className="max-w-xl">
      <EmptyState icon="search_off" title="Élément introuvable" description="Il a peut-être été supprimé, ou il appartient à un autre agent." action={<ButtonLink href="/crm">Retour au tableau de bord</ButtonLink>} />
    </div>
  );
}
