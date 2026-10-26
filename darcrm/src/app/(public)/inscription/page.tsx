import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { isStaff } from "@/domain/auth/session";
import { readSession } from "@/infrastructure/session";
import { AuthShell } from "@/components/public/auth-shell";
import { RegisterForm } from "@/components/public/auth-forms";
import { getDeps } from "@/infrastructure/container";

export const metadata: Metadata = { title: "Créer un compte · DarCRM" };

type SearchParams = Promise<{ next?: string }>;

export default async function RegisterPage({ searchParams }: { searchParams: SearchParams }) {
  const { next = "/compte" } = await searchParams;
  const session = await readSession();
  if (session) redirect(isStaff(session) ? "/crm" : "/compte");

  const agency = await getDeps().agency.get();

  return (
    <AuthShell
      title="Créer un compte"
      subtitle="Gratuit, en moins d'une minute."
      panelTitle="Ne ratez plus le bien qui vous correspond."
      agencyName={agency.name}
      imageUrl={agency.heroImageUrl}
      points={[
        { icon: "favorite", title: "Enregistrez vos coups de cœur", text: "Gardez les annonces qui vous plaisent sur tous vos appareils." },
        { icon: "saved_search", title: "Sauvegardez vos recherches", text: "Ville, budget, type de bien : une fois, c'est fait." },
        { icon: "notifications_active", title: "Alertes WhatsApp", text: "Un message pour chaque nouvelle annonce qui correspond." },
      ]}
    >
      <RegisterForm next={next} />
    </AuthShell>
  );
}
