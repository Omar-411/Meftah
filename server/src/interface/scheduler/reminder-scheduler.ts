import { Inject, Injectable, Logger, OnApplicationShutdown, OnModuleInit } from "@nestjs/common";
import { dispatchDueReminders } from "../../application/crm/reminders";
import type { Deps } from "../../application/ports";
import { ENV, type Env } from "../../config/env";
import { DEPS } from "../tokens";

const TICK_MS = 60_000;

/** Wakes up every minute to send the visit reminders that became due. One run at a time, and a failure never stops the next one. */
@Injectable()
export class ReminderScheduler implements OnModuleInit, OnApplicationShutdown {
  private readonly logger = new Logger("Rappels");
  private timer: NodeJS.Timeout | undefined;
  private running = false;

  constructor(
    @Inject(DEPS) private readonly deps: Deps,
    @Inject(ENV) private readonly env: Env,
  ) {}

  onModuleInit() {
    if (!this.env.REMINDERS_ENABLED) return;
    this.timer = setInterval(() => void this.tick(), TICK_MS);
    this.timer.unref();
  }

  onApplicationShutdown() {
    if (this.timer) clearInterval(this.timer);
  }

  async tick(now = new Date()) {
    if (this.running) return;
    this.running = true;
    try {
      const { sent, skipped } = await dispatchDueReminders(this.deps, now);
      if (sent + skipped > 0) this.logger.log(`${sent} rappel(s) envoyé(s), ${skipped} ignoré(s) (numéro invalide).`);
    } catch (error) {
      this.logger.error(`Échec de l'envoi des rappels : ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      this.running = false;
    }
  }
}
