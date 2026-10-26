import { BadRequestException, Body, Controller, Get, Inject, Patch, Post, Put, Query } from "@nestjs/common";
import type { z } from "zod";
import { getAgencySettings, listNotifications, markNotificationsRead, saveAgencySettings } from "../../../application/crm/admin";
import { listDealRecords, recordDeal } from "../../../application/crm/records";
import type { Deps } from "../../../application/ports";
import type { Session } from "../../../domain/auth/session";
import { DEPS } from "../../tokens";
import { agencyBody, dealBody } from "../schemas";
import { CurrentSession } from "../session";
import { unwrap, ZodPipe } from "../zod";

const parseDate = (raw: string | undefined, name: string) => {
  const date = new Date(raw ?? "");
  if (Number.isNaN(date.getTime())) throw new BadRequestException(`${name} invalide.`);
  return date;
};

@Controller("crm/deals")
export class CrmDealsController {
  constructor(@Inject(DEPS) private readonly deps: Deps) {}

  @Get()
  list(@CurrentSession() session: Session | null, @Query("from") from?: string, @Query("to") to?: string) {
    const range = from && to ? { from: parseDate(from, "from"), to: parseDate(to, "to") } : undefined;
    return listDealRecords(this.deps, session, range);
  }

  @Post()
  async create(@Body(new ZodPipe(dealBody)) body: z.infer<typeof dealBody>, @CurrentSession() session: Session | null) {
    return unwrap(await recordDeal(this.deps, session, body, new Date()));
  }
}

@Controller("crm/notifications")
export class CrmNotificationsController {
  constructor(@Inject(DEPS) private readonly deps: Deps) {}

  @Get()
  list(@CurrentSession() session: Session | null) {
    return listNotifications(this.deps, session, new Date());
  }

  @Patch("read")
  async markRead(@CurrentSession() session: Session | null) {
    await markNotificationsRead(this.deps, session);
    return { ok: true };
  }
}

@Controller("crm/settings")
export class CrmSettingsController {
  constructor(@Inject(DEPS) private readonly deps: Deps) {}

  @Get("agency")
  get(@CurrentSession() session: Session | null) {
    return getAgencySettings(this.deps, session);
  }

  @Put("agency")
  async save(@Body(new ZodPipe(agencyBody)) body: z.infer<typeof agencyBody>, @CurrentSession() session: Session | null) {
    const current = await this.deps.agency.get();
    return unwrap(await saveAgencySettings(this.deps, session, { ...body, id: current.id }));
  }
}
