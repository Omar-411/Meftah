import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export default function PublicNotFound() {
  return (
    <div className="mx-auto max-w-2xl px-space-md py-space-xl">
      <EmptyState
        icon="home_work"
        title="Cette annonce n'est plus disponible"
        description="Le bien a peut-être été vendu, loué ou retiré par l'agence. Découvrez les annonces actuelles."
        action={<ButtonLink href="/annonces">Voir les annonces</ButtonLink>}
      />
    </div>
  );
}
