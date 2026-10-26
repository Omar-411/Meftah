"use client";

import { useTransition } from "react";
import { announce } from "@/lib/toast";
import { setListingStateAction } from "@/app/actions/crm";
import type { ListingStatus, Visibility } from "@/domain/listing/catalog";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";

interface Props {
  id: string;
  visibility: Visibility;
  status: ListingStatus;
}

/** One-click state changes. Publishing here is the same action as in the edit form: the public site updates instantly. */
export function ListingRowActions({ id, visibility, status }: Props) {
  const [pending, startTransition] = useTransition();
  const change = (next: { visibility?: Visibility; status?: ListingStatus }) => startTransition(async () => announce(await setListingStateAction(id, next)));

  return (
    <div className="flex items-center gap-1">
      {visibility === "draft" ? (
        <Button size="sm" variant="secondary" disabled={pending} onClick={() => change({ visibility: "published" })}>
          <Icon name="publish" className="text-[18px]" />
          Publier
        </Button>
      ) : (
        <Button size="sm" variant="ghost" disabled={pending} onClick={() => change({ visibility: "draft" })}>
          <Icon name="visibility_off" className="text-[18px]" />
          Dépublier
        </Button>
      )}
      {status === "available" && (
        <Button size="sm" variant="ghost" disabled={pending} onClick={() => change({ status: "reserved" })} aria-label="Marquer comme réservé">
          <Icon name="bookmark" className="text-[18px]" />
        </Button>
      )}
      {status === "reserved" && (
        <Button size="sm" variant="ghost" disabled={pending} onClick={() => change({ status: "available" })} aria-label="Remettre disponible">
          <Icon name="undo" className="text-[18px]" />
        </Button>
      )}
    </div>
  );
}
