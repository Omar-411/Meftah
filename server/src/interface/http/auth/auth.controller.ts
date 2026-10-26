import { Body, Controller, Get, HttpCode, Inject, Post, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Throttle } from "@nestjs/throttler";
import type { z } from "zod";
import { login, register } from "../../../application/auth/auth";
import type { Deps } from "../../../application/ports";
import type { Session } from "../../../domain/auth/session";
import { DEPS } from "../../tokens";
import { CurrentSession, type TokenPayload } from "../session";
import { loginBody, registerBody } from "../schemas";
import { unwrap, ZodPipe } from "../zod";

interface AuthResponse {
  token: string;
  user: { id: string; fullName: string; role: Session["role"] };
}

@Controller("auth")
export class AuthController {
  constructor(
    @Inject(DEPS) private readonly deps: Deps,
    @Inject(JwtService) private readonly jwt: JwtService,
  ) {}

  private async respond(session: Session): Promise<AuthResponse> {
    const payload: TokenPayload = { sub: session.userId, role: session.role, name: session.displayName };
    return { token: await this.jwt.signAsync(payload), user: { id: session.userId, fullName: session.displayName, role: session.role } };
  }

  @Post("login")
  @HttpCode(200)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  async login(@Body(new ZodPipe(loginBody)) body: z.infer<typeof loginBody>) {
    const result = await login(this.deps, body.email, body.password);
    if (!result.ok) throw new UnauthorizedException(result.error);
    return this.respond(result.value);
  }

  @Post("register")
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async register(@Body(new ZodPipe(registerBody)) body: z.infer<typeof registerBody>) {
    return this.respond(unwrap(await register(this.deps, body)));
  }

  @Get("me")
  me(@CurrentSession() session: Session | null) {
    if (!session) throw new UnauthorizedException("Connectez-vous pour continuer.");
    return { id: session.userId, fullName: session.displayName, role: session.role };
  }
}
