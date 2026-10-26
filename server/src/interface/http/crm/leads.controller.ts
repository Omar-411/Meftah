import { Body, Controller, Get, HttpCode, Inject, Param, Post, Put, Query } from "@nestjs/common";
import type { z } from "zod";
import { createLead } from "../../../application/crm/leads";
import { addActivityRecord, getLeadRecord, listActivityRecords, listLeadRecords, saveLeadRecord } from "../../../application/crm/records";
import type { Deps } from "../../../application/ports";
import type { Session } from "../../../domain/auth/session";
import type { LeadStage } from "../../../domain/lead/lead";
import { DEPS } from "../../tokens";
import { activityBody, createLeadBody, saveLeadBody } from "../schemas";
import { CurrentSession } from "../session";
import { unwrap, ZodPipe } from "../zod";

@Controller("crm/leads")
export class CrmLeadsController {
  constructor(@Inject(DEPS) private readonly deps: Deps) {}

  @Get()
  list(@CurrentSession() session: Session | null, @Query("q") q?: string, @Query("stage") stage?: LeadStage, @Query("agentId") agentId?: string) {
    return listLeadRecords(this.deps, session, { q, stage, agentId });
  }

  @Get(":id")
  one(@Param("id") id: string, @CurrentSession() session: Session | null) {
    return getLeadRecord(this.deps, session, id);
  }

  /** Manual leads are always owned by the creator; ownership changes go through PUT by an admin. */
  @Post()
  async create(@Body(new ZodPipe(createLeadBody)) body: z.infer<typeof createLeadBody>, @CurrentSession() session: Session | null) {
    return unwrap(await createLead(this.deps, session, body, new Date()));
  }

  @Put(":id")
  async update(@Param("id") id: string, @Body(new ZodPipe(saveLeadBody)) body: z.infer<typeof saveLeadBody>, @CurrentSession() session: Session | null) {
    return unwrap(await saveLeadRecord(this.deps, session, id, body, new Date()));
  }

  @Get(":id/activities")
  activities(@Param("id") id: string, @CurrentSession() session: Session | null) {
    return listActivityRecords(this.deps, session, id);
  }

  @Post(":id/activities")
  async addActivity(@Param("id") id: string, @Body(new ZodPipe(activityBody)) body: z.infer<typeof activityBody>, @CurrentSession() session: Session | null) {
    return unwrap(await addActivityRecord(this.deps, session, id, body, new Date()));
  }
}
