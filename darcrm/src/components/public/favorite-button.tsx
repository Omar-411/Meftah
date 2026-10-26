"use client";

import Link from "next/link";
import { useOptimistic, useTransition } from "react";
import { announce } from "@/lib/toast";
import { toggleFavoriteAction } from "@/app/actions/public";
import { cn } from "@/lib/cn";
import { Icon } from "@/components/ui/icon";

interface FavoriteButtonProps {
  listingId: string;
  initial: boolean;
  /** Anonymous visitors are sent to the login page and come back here afterwards. */
  loginHref: string | null;
  className?: string;
  withLabel?: boolean;
}

export function FavoriteButton({ listingId, initial, loginHref, className, withLabel }: FavoriteButtonProps) {
  const [favorite, setFavorite] = useOptimistic(initial, (_current, next: boolean) => next);
  const [, startTransition] = useTransition();

  const base = cn(
    "inline-flex items-center justify-center gap-1.5 rounded-full bg-surface-container-lowest/95 text-on-surface shadow-sm backdrop-blur transition-colors hover:bg-surface-container-lowest",
    withLabel ? "h-10 px-space-md font-label-md text-label-md" : "h-9 w-9",
    className,
  );
  const heart = (
    <>
      <Icon name="favorite" className={cn("text-[20px]", favorite ? "text-error [font-variation-settings:'FILL'_1]" : "text-on-surface-variant")} />
      {withLabel && <span>{favorite ? "Enregistré" : "Enregistrer"}</span>}
    </>
  );

  if (loginHref) {
    return (
      <Link href={loginHref} aria-label="Connectez-vous pour enregistrer ce bien" className={base}>
        {heart}
      </Link>
    );
  }

  return (
    <button
      type="button"
      aria-pressed={favorite}
      aria-label={favorite ? "Retirer des favoris" : "Ajouter aux favoris"}
      className={base}
      onClick={() =>
        startTransition(async () => {
          const previous = favorite;
          setFavorite(!previous);
          const result = await toggleFavoriteAction(listingId, !previous);
          announce(result);
          if (result.status === "error") setFavorite(previous);
        })
      }
    >
      {heart}
    </button>
  );
}
