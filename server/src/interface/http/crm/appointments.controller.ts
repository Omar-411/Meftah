import { BadRequestException, Body, Controller, Get, Inject, Param, Patch, Post, Query } from "@nestjs/common";
import type { z } from "zod";
import { scheduleAppointment } from "../../../application/crm/appointments";
import { getAppointmentRecord, listAppointmentRecords, updateAppointmentStatus } from "../../../application/crm/records";
import type { Deps } from "../../../application/ports";
import type { Session } from "../../../domain/auth/session";
import { DEPS } from "../../tokens";
import { appointmentBody, appointmentStatusBody } from "../schemas";
import { CurrentSession } from "../session";
import { unwrap, ZodPipe } from "../zod";

const parseDate = (raw: string | undefined, name: string) => {
  if (!raw) return undefined;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) throw new BadRequestException(`${name} invalide.`);
  return date;
};

@Controller("crm/appointments")
export class CrmAppointmentsController {
  constructor(@Inject(DEPS) private readonly deps: Deps) {}

  @Get()
  list(@CurrentSession() session: Session | null, @Query("from") from?: string, @Query("to") to?: string, @Query("leadId") leadId?: string) {
    return listAppointmentRecords(this.deps, session, { from: parseDate(from, "from"), to: parseDate(to, "to"), leadId });
  }

  @Get(":id")
  one(@Param("id") id: string, @CurrentSession() session: Session | null) {
    return getAppointmentRecord(this.deps, session, id);
  }

  @Post()
  async create(@Body(new ZodPipe(appointmentBody)) body: z.infer<typeof appointmentBody>, @CurrentSession() session: Session | null) {
    return unwrap(await scheduleAppointment(this.deps, session, body, new Date()));
  }

  /** Only the status can change here; the front sends the whole record and the rest is ignored. */
  @Patch(":id")
  update(@Param("id") id: string, @Body(new ZodPipe(appointmentStatusBody)) body: z.infer<typeof appointmentStatusBody>, @CurrentSession() session: Session | null) {
    return updateAppointmentStatus(this.deps, session, id, body.status);
  }
}
