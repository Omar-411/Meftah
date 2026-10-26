import { statusLabel, type ListingStatus, type TransactionType, type Visibility } from "@/domain/listing/catalog";
import { STAGE_LABELS, type LeadStage } from "@/domain/lead/lead";
import type { Tone } from "@/domain/shared/tone";
import { Badge } from "@/components/ui/badge";

const STAGE_TONES: Record<LeadStage, Tone> = {
  new: "highlight",
  contacted: "info",
  visit_scheduled: "warning",
  negotiating: "warning",
  closed: "success",
  lost: "neutral",
};

export const StageBadge = ({ stage }: { stage: LeadStage }) => <Badge tone={STAGE_TONES[stage]}>{STAGE_LABELS[stage]}</Badge>;

const STATUS_TONES: Record<ListingStatus, Tone> = { available: "success", reserved: "warning", closed: "neutral" };

export const ListingStatusBadge = ({ status, transaction }: { status: ListingStatus; transaction: TransactionType }) => (
  <Badge tone={STATUS_TONES[status]}>{statusLabel(status, transaction)}</Badge>
);

export const VisibilityBadge = ({ visibility }: { visibility: Visibility }) =>
  visibility === "published" ? <Badge tone="info">En ligne</Badge> : <Badge tone="neutral">Brouillon</Badge>;
