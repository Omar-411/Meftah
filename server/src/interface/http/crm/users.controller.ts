import { Body, Controller, Get, Inject, Param, Patch, Post } from "@nestjs/common";
import type { z } from "zod";
import type { Deps } from "../../../application/ports";
import { changeAccountRole, createStaffAccount, listAccounts, setAccountActive } from "../../../application/crm/users";
import type { Session } from "../../../domain/auth/session";
import { DEPS } from "../../tokens";
import { accountActiveBody, accountRoleBody, staffAccountBody } from "../schemas";
import { CurrentSession } from "../session";
import { unwrap, ZodPipe } from "../zod";

@Controller("crm/users")
export class CrmUsersController {
  constructor(@Inject(DEPS) private readonly deps: Deps) {}

  @Get()
  list(@CurrentSession() session: Session | null) {
    return listAccounts(this.deps, session);
  }

  @Post()
  async create(@Body(new ZodPipe(staffAccountBody)) body: z.infer<typeof staffAccountBody>, @CurrentSession() session: Session | null) {
    return unwrap(await createStaffAccount(this.deps, session, body));
  }

  @Patch(":id/role")
  async role(@Param("id") id: string, @Body(new ZodPipe(accountRoleBody)) body: z.infer<typeof accountRoleBody>, @CurrentSession() session: Session | null) {
    unwrap(await changeAccountRole(this.deps, session, id, body.role));
    return { ok: true };
  }

  @Patch(":id/active")
  async active(@Param("id") id: string, @Body(new ZodPipe(accountActiveBody)) body: z.infer<typeof accountActiveBody>, @CurrentSession() session: Session | null) {
    unwrap(await setAccountActive(this.deps, session, id, body.active));
    return { ok: true };
  }
}
