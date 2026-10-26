import Image from "next/image";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";

export function ListingThumb({ url, alt, className }: { url: string | null; alt: string; className?: string }) {
  return (
    <span className={cn("relative block shrink-0 overflow-hidden rounded-lg bg-surface-container-high", className ?? "h-14 w-20")}>
      {url ? (
        <Image src={url} alt={alt} fill sizes="96px" className="object-cover" />
      ) : (
        <span className="flex h-full w-full items-center justify-center text-outline">
          <Icon name="image" className="text-[22px]" />
        </span>
      )}
    </span>
  );
}
