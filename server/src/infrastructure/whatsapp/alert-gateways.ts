import type { AlertGateway } from "../../application/ports";

export interface Logger {
  log(message: string): void;
  warn(message: string): void;
}

/** Used when WhatsApp credentials are not configured: the alert is recorded by the use case, only the send is skipped. */
export class LogAlertGateway implements AlertGateway {
  constructor(private readonly logger: Logger) {}
  async sendWhatsapp(input: { to: string; text: string }) {
    this.logger.log(`[whatsapp:disabled] → ${input.to}: ${input.text}`);
  }
}

/** Meta WhatsApp Cloud API. Free-form text only reaches users inside the 24h window; production needs an approved template. */
export class CloudApiAlertGateway implements AlertGateway {
  constructor(
    private readonly config: { phoneNumberId: string; accessToken: string },
    private readonly logger: Logger,
    private readonly http: typeof fetch = fetch,
  ) {}

  async sendWhatsapp(input: { to: string; text: string }) {
    try {
      const response = await this.http(`https://graph.facebook.com/v21.0/${this.config.phoneNumberId}/messages`, {
        method: "POST",
        headers: { Authorization: `Bearer ${this.config.accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ messaging_product: "whatsapp", to: toE164(input.to), type: "text", text: { body: input.text } }),
      });
      if (!response.ok) this.logger.warn(`WhatsApp a refusé le message (${response.status}).`);
    } catch (error) {
      // A failed alert must never block publishing a listing.
      this.logger.warn(`WhatsApp injoignable : ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

export function toE164(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return digits.startsWith("216") ? digits : `216${digits}`;
}
