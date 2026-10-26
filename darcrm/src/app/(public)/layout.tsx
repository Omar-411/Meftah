import { getDeps } from "@/infrastructure/container";
import { readSession } from "@/infrastructure/session";
import { SiteFooter } from "@/components/public/site-footer";
import { SiteHeader } from "@/components/public/site-header";

export const dynamic = "force-dynamic";

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const [agency, session] = await Promise.all([getDeps().agency.get(), readSession()]);
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader agencyName={agency.name} session={session} />
      <main className="flex-1">{children}</main>
      <SiteFooter agency={agency} />
    </div>
  );
}
