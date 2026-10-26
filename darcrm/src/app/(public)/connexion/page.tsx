import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { isStaff } from "@/domain/auth/session";
import { readSession } from "@/infrastructure/session";
import { AuthShell } from "@/components/public/auth-shell";
import { LoginForm, type DemoAccount } from "@/components/public/auth-forms";
import { getDeps } from "@/infrastructure/container";

export const metadata: Metadata = { title: "Connexion · DarCRM" };

const DEMO_ACCOUNTS: readonly DemoAccount[] = [
  { label: "Administrateur", description: "Nadia · vue agence, agents, paramètres", email: "admin@darcrm.tn", password: "demo1234", icon: "admin_panel_settings" },
  { label: "Agent", description: "Sami · ses biens et ses prospects", email: "sami@darcrm.tn", password: "demo1234", icon: "badge" },
  { label: "Visiteur", description: "Amine · favoris et alertes WhatsApp", email: "user@darcrm.tn", password: "demo1234", icon: "person" },
];

type SearchParams = Promise<{ next?: string }>;

export default async function LoginPage({ searchParams }: { searchParams: SearchParams }) {
  const { next = "/compte" } = await searchParams;
  const session = await readSession();
  if (session) redirect(isStaff(session) ? "/crm" : "/compte");

  const agency = await getDeps().agency.get();

  return (
    <AuthShell
      title="Connexion"
      subtitle="Retrouvez vos favoris et vos alertes, ou accédez à l’espace agence."
      panelTitle="Content de vous revoir."
      agencyName={agency.name}
      imageUrl={agency.heroImageUrl}
      points={[
        { icon: "favorite", title: "Vos favoris", text: "Retrouvez les biens que vous avez gardés de côté." },
        { icon: "notifications_active", title: "Alertes WhatsApp", text: "Soyez prévenu dès qu'une annonce correspond à votre recherche." },
        { icon: "support_agent", title: "Espace agence", text: "Prospects, visites et ventes au même endroit." },
      ]}
    >
      <LoginForm next={next} demoAccounts={process.env.API_MODE === "http" ? [] : DEMO_ACCOUNTS} />
    </AuthShell>
  );
}
