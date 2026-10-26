import Link from "next/link";
import type { AgencySettings } from "@/domain/agency/agency";
import { telLink, whatsappLink } from "@/domain/shared/format";
import { Icon } from "@/components/ui/icon";

export function SiteFooter({ agency }: { agency: AgencySettings }) {
  return (
    <footer className="mt-space-xl bg-primary text-on-primary">
      <div className="mx-auto grid max-w-[1200px] gap-space-lg px-space-md py-space-xl md:grid-cols-[1.4fr_1fr_1fr] lg:px-gutter-desktop">
        <div>
          <p className="font-display text-[20px] font-semibold">{agency.name}</p>
          <p className="mt-1 max-w-sm font-body-md text-body-md text-on-primary/70">{agency.tagline}</p>
        </div>

        <div>
          <p className="font-label-md text-label-md font-semibold">Nous contacter</p>
          <ul className="mt-space-sm space-y-2 font-body-sm text-body-sm text-on-primary/80">
            <li className="flex items-center gap-2">
              <Icon name="call" className="text-[18px]" />
              <a href={telLink(agency.phone)} className="hover:underline">{agency.phone}</a>
            </li>
            <li className="flex items-center gap-2">
              <Icon name="chat" className="text-[18px]" />
              <a href={whatsappLink(agency.whatsapp)} className="hover:underline">WhatsApp</a>
            </li>
            <li className="flex items-center gap-2">
              <Icon name="mail" className="text-[18px]" />
              <a href={`mailto:${agency.email}`} className="hover:underline">{agency.email}</a>
            </li>
            <li className="flex items-start gap-2">
              <Icon name="location_on" className="text-[18px]" />
              <span>{agency.address}</span>
            </li>
          </ul>
        </div>

        <div>
          <p className="font-label-md text-label-md font-semibold">Explorer</p>
          <ul className="mt-space-sm space-y-2 font-body-sm text-body-sm text-on-primary/80">
            <li><Link href="/annonces?type=sale" className="hover:underline">Biens à vendre</Link></li>
            <li><Link href="/annonces?type=rent" className="hover:underline">Biens à louer</Link></li>
            <li><Link href="/inscription" className="hover:underline">Créer une alerte WhatsApp</Link></li>
            <li><Link href="/connexion" className="hover:underline">Espace agence</Link></li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
