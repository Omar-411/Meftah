import type { ListingFilters } from "../listing/filters";

export interface PublicUser {
  readonly id: string;
  readonly fullName: string;
  readonly email: string;
  readonly phone: string;
}

export interface SavedSearch {
  readonly id: string;
  readonly userId: string;
  readonly name: string;
  readonly filters: ListingFilters;
  readonly whatsappAlerts: boolean;
  readonly whatsappPhone: string;
  readonly createdAt: string;
}

/** A WhatsApp alert sent because a newly published listing matched a saved search. */
export interface AlertDispatch {
  readonly id: string;
  readonly userId: string;
  readonly savedSearchId: string;
  readonly listingId: string;
  readonly listingTitle: string;
  readonly listingSlug: string;
  readonly channel: "whatsapp";
  readonly message: string;
  readonly sentAt: string;
}

export type NotificationKind = "new_lead" | "reminder" | "lead_assigned" | "alert_sent";

export interface CrmNotification {
  readonly id: string;
  readonly userId: string;
  readonly kind: NotificationKind;
  readonly title: string;
  readonly body: string;
  readonly href: string;
  readonly at: string;
  readonly read: boolean;
}
