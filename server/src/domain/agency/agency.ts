export interface AgencySettings {
  readonly id: string;
  readonly name: string;
  readonly tagline: string;
  readonly phone: string;
  readonly whatsapp: string;
  readonly email: string;
  readonly address: string;
  readonly heroImageUrl: string;
  readonly whatsappAlertsEnabled: boolean;
  /** Sends a WhatsApp reminder to the prospect the day before and one hour before each visit. Off unless the agency opts in. */
  readonly visitRemindersEnabled?: boolean;
}
