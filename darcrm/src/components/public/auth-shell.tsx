import Image from "next/image";
import { Icon } from "@/components/ui/icon";

interface AuthShellProps {
  title: string;
  subtitle: string;
  panelTitle: string;
  points: ReadonlyArray<{ icon: string; title: string; text: string }>;
  imageUrl?: string;
  agencyName: string;
  children: React.ReactNode;
}

/** Two-column auth layout: agency-branded panel on large screens, just the form on mobile. */
export function AuthShell({ title, subtitle, panelTitle, points, imageUrl, agencyName, children }: AuthShellProps) {
  return (
    <div className="mx-auto max-w-5xl px-space-md py-space-lg lg:py-space-xl">
      <div className="grid overflow-hidden rounded-3xl bg-surface-container-lowest shadow-lg lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
        <aside className="relative hidden flex-col justify-between overflow-hidden bg-primary p-space-xl text-on-primary lg:flex">
          {imageUrl && <Image src={imageUrl} alt="" fill sizes="480px" className="object-cover opacity-30 mix-blend-luminosity" />}
          <div className="absolute inset-0 bg-gradient-to-b from-primary/60 via-primary/80 to-primary" />
          <div className="relative">
            <p className="font-label-md text-label-md font-semibold text-primary-fixed-dim">{agencyName}</p>
            <h2 className="mt-space-sm font-display text-[30px] font-semibold leading-tight">{panelTitle}</h2>
          </div>
          <ul className="relative space-y-space-md">
            {points.map((point) => (
              <li key={point.title} className="flex gap-space-sm">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15">
                  <Icon name={point.icon} className="text-[22px]" />
                </span>
                <span>
                  <span className="block font-headline-sm text-headline-sm">{point.title}</span>
                  <span className="block font-body-sm text-body-sm text-on-primary-container">{point.text}</span>
                </span>
              </li>
            ))}
          </ul>
        </aside>

        <section className="p-space-lg sm:p-space-xl">
          <h1 className="font-display text-[28px] font-semibold text-on-surface">{title}</h1>
          <p className="mb-space-lg mt-1 max-w-prose font-body-md text-body-md text-on-surface-variant">{subtitle}</p>
          {children}
        </section>
      </div>
    </div>
  );
}
