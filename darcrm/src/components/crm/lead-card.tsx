import Link from "next/link";
import type { LeadCard as LeadCardData } from "@/application/crm/leads";
import { SOURCE_ICONS, SOURCE_LABELS, isOpenStage } from "@/domain/lead/lead";
import { formatRelativeFr } from "@/domain/shared/format";
import { Icon } from "@/components/ui/icon";
import { StageQuickSelect } from "./stage-quick-select";

interface Props {
  data: LeadCardData;
  now: Date;
  showAgent: boolean;
}

export function LeadCard({ data: { lead, listing, agentName }, now, showAgent }: Props) {
  return (
    <article className="rounded-lg bg-surface-container-lowest p-space-md shadow-sm">
      <Link href={`/crm/prospects/${lead.id}`} className="block">
        <p className="font-label-md text-label-md font-semibold text-on-surface hover:underline">{lead.fullName}</p>
        <p className="mt-0.5 truncate font-body-sm text-body-sm text-on-surface-variant">{listing ? `${listing.ref} · ${listing.title}` : lead.message || "Recherche générale"}</p>
      </Link>
      <p className="mt-space-sm flex flex-wrap items-center gap-x-space-sm gap-y-0.5 font-label-sm text-label-sm text-outline">
        <span className="flex items-center gap-1">
          <Icon name={SOURCE_ICONS[lead.source]} className="text-[14px]" />
          {SOURCE_LABELS[lead.source]}
        </span>
        <span>{formatRelativeFr(new Date(lead.lastContactAt ?? lead.createdAt), now)}</span>
        {showAgent && <span>{agentName}</span>}
      </p>
      {isOpenStage(lead.stage) && (
        <div className="mt-space-sm">
          <StageQuickSelect leadId={lead.id} stage={lead.stage} />
        </div>
      )}
    </article>
  );
}
