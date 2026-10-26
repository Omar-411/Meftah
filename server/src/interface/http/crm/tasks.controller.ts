import { Body, Controller, Get, Inject, Param, Patch, Post, Query } from "@nestjs/common";
import type { z } from "zod";
import { createTask, listTasks, setTaskDone } from "../../../application/crm/tasks";
import type { Deps } from "../../../application/ports";
import type { Session } from "../../../domain/auth/session";
import { DEPS } from "../../tokens";
import { taskBody, taskDoneBody } from "../schemas";
import { CurrentSession } from "../session";
import { unwrap, ZodPipe } from "../zod";

@Controller("crm/tasks")
export class CrmTasksController {
  constructor(@Inject(DEPS) private readonly deps: Deps) {}

  @Get()
  list(@CurrentSession() session: Session | null, @Query("leadId") leadId?: string, @Query("includeDone") includeDone?: string) {
    return listTasks(this.deps, session, { leadId, includeDone: includeDone === "true" });
  }

  @Post()
  async create(@Body(new ZodPipe(taskBody)) body: z.infer<typeof taskBody>, @CurrentSession() session: Session | null) {
    return unwrap(await createTask(this.deps, session, body, new Date()));
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body(new ZodPipe(taskDoneBody)) body: z.infer<typeof taskDoneBody>, @CurrentSession() session: Session | null) {
    return setTaskDone(this.deps, session, id, body.done, new Date());
  }
}
