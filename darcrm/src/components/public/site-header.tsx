import Image from "next/image";
import Link from "next/link";
import { logoutAction } from "@/app/actions/auth";
import { isStaff, type Session } from "@/domain/auth/session";
import { LOGO } from "@/infrastructure/mock-assets";
import { ButtonLink, Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";

const NAV = [
  { href: "/annonces?type=sale", label: "Acheter" },
  { href: "/annonces?type=rent", label: "Louer" },
  { href: "/annonces", label: "Tous les biens" },
] as const;

export function SiteHeader({ agencyName, session }: { agencyName: string; session: Session | null }) {
  return (
    <header className="sticky top-0 z-30 border-b border-outline-variant/40 bg-surface-container-lowest/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between gap-space-md px-space-md lg:px-gutter-desktop">
        <Link href="/" className="flex items-center gap-2.5">
          <Image src={LOGO} alt="" width={32} height={32} className="h-8 w-8 rounded-lg" />
          <span className="font-display text-[18px] font-semibold tracking-tight text-primary">{agencyName}</span>
        </Link>

        <nav aria-label="Navigation principale" className="hidden items-center gap-space-lg md:flex">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className="font-label-md text-label-md text-on-surface-variant transition-colors hover:text-primary">
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-space-sm">
          {session === null ? (
            <>
              <ButtonLink href="/connexion" variant="ghost" size="sm">
                Connexion
              </ButtonLink>
              <ButtonLink href="/inscription" size="sm" className="hidden sm:inline-flex">
                Créer un compte
              </ButtonLink>
            </>
          ) : (
            <>
              {isStaff(session) ? (
                <ButtonLink href="/crm" variant="secondary" size="sm" aria-label="Espace CRM">
                  <Icon name="dashboard" className="text-[18px]" />
                  <span className="hidden sm:inline">Espace CRM</span>
                </ButtonLink>
              ) : (
                <ButtonLink href="/compte" variant="secondary" size="sm" aria-label="Mon compte">
                  <Icon name="favorite" className="text-[18px]" />
                  <span className="hidden sm:inline">Mon compte</span>
                </ButtonLink>
              )}
              <ButtonLink href={isStaff(session) ? "/crm/profil" : "/compte/profil"} variant="ghost" size="sm" aria-label="Mon profil">
                <Icon name="account_circle" className="text-[20px]" />
              </ButtonLink>
              <form action={logoutAction}>
                <Button type="submit" variant="ghost" size="sm" aria-label="Se déconnecter">
                  <Icon name="logout" className="text-[18px]" />
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
