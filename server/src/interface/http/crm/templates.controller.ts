import { Body, Controller, Delete, Get, HttpCode, Inject, Param, Put } from "@nestjs/common";
import type { z } from "zod";
import { listTemplateOverrides, resetTemplate, saveTemplate } from "../../../application/crm/templates";
import type { Deps } from "../../../application/ports";
import type { Session } from "../../../domain/auth/session";
import { DEPS } from "../../tokens";
import { templateBody } from "../schemas";
import { CurrentSession } from "../session";
import { unwrap, ZodPipe } from "../zod";

@Controller("crm/templates")
export class CrmTemplatesController {
  constructor(@Inject(DEPS) private readonly deps: Deps) {}

  /** Only what the agency customised; built-in texts live in the domain. */
  @Get()
  list(@CurrentSession() session: Session | null) {
    return listTemplateOverrides(this.deps, session);
  }

  @Put(":key")
  async save(@Param("key") key: string, @Body(new ZodPipe(templateBody)) body: z.infer<typeof templateBody>, @CurrentSession() session: Session | null) {
    return unwrap(await saveTemplate(this.deps, session, key, body.body));
  }

  @Delete(":key")
  @HttpCode(204)
  async reset(@Param("key") key: string, @CurrentSession() session: Session | null) {
    await resetTemplate(this.deps, session, key);
  }
}
