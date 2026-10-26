import { Controller, Get, Inject, NotFoundException, Param } from "@nestjs/common";
import type { Deps } from "../../../application/ports";
import { toPublicAgent } from "../../../domain/agent/agent";
import { isStaff, type Session } from "../../../domain/auth/session";
import { DEPS } from "../../tokens";
import { CurrentSession } from "../session";

/** Staff tokens get the full agent (commission, e-mail); everyone else only the public fields. */
@Controller("agents")
export class AgentsController {
  constructor(@Inject(DEPS) private readonly deps: Deps) {}

  @Get()
  async list(@CurrentSession() session: Session | null) {
    const agents = await this.deps.agents.list();
    return isStaff(session) ? agents : agents.map(toPublicAgent);
  }

  @Get(":id")
  async one(@Param("id") id: string, @CurrentSession() session: Session | null) {
    const agent = await this.deps.agents.findById(id);
    if (!agent) throw new NotFoundException("Agent introuvable.");
    return isStaff(session) ? agent : toPublicAgent(agent);
  }
}
