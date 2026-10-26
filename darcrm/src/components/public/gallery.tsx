"use client";

import Image from "next/image";
import { useState } from "react";
import type { ListingPhoto } from "@/domain/listing/listing";
import { cn } from "@/lib/cn";
import { Icon } from "@/components/ui/icon";

export function Gallery({ photos, title }: { photos: readonly ListingPhoto[]; title: string }) {
  const [index, setIndex] = useState(0);
  const current = photos[index];

  if (!current) {
    return (
      <div className="flex aspect-[16/10] items-center justify-center rounded-2xl bg-surface-container-high text-outline">
        <Icon name="image" className="text-[48px]" />
      </div>
    );
  }

  const step = (delta: number) => setIndex((value) => (value + delta + photos.length) % photos.length);
  const arrow = "absolute top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-surface-container-lowest/90 text-on-surface shadow-sm hover:bg-surface-container-lowest";

  return (
    <div>
      <div className="relative aspect-[16/10] overflow-hidden rounded-2xl bg-surface-container-high">
        <Image src={current.url} alt={current.alt || title} fill priority sizes="(min-width: 1024px) 760px, 100vw" className="object-cover" />
        {photos.length > 1 && (
          <>
            <button type="button" aria-label="Photo précédente" className={cn(arrow, "left-space-sm")} onClick={() => step(-1)}>
              <Icon name="chevron_left" className="text-[24px]" />
            </button>
            <button type="button" aria-label="Photo suivante" className={cn(arrow, "right-space-sm")} onClick={() => step(1)}>
              <Icon name="chevron_right" className="text-[24px]" />
            </button>
            <span className="absolute bottom-space-sm right-space-sm rounded-full bg-primary/80 px-2.5 py-0.5 font-label-sm text-label-sm text-on-primary">
              {index + 1} / {photos.length}
            </span>
          </>
        )}
      </div>

      {photos.length > 1 && (
        <ul className="mt-space-sm flex gap-space-sm overflow-x-auto pb-1">
          {photos.map((photo, photoIndex) => (
            <li key={photo.id} className="shrink-0">
              <button
                type="button"
                aria-label={`Voir la photo ${photoIndex + 1}`}
                aria-current={photoIndex === index}
                onClick={() => setIndex(photoIndex)}
                className={cn("relative block h-16 w-24 overflow-hidden rounded-lg ring-2 transition", photoIndex === index ? "ring-primary-container" : "ring-transparent opacity-70 hover:opacity-100")}
              >
                <Image src={photo.url} alt="" fill sizes="96px" className="object-cover" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
