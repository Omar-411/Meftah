import { CanActivate, createParamDecorator, ExecutionContext, Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import type { Request } from "express";
import type { AuthGateway } from "../../application/ports";
import type { Role, Session } from "../../domain/auth/session";
import { AUTH_GATEWAY } from "../tokens";

export interface TokenPayload {
  readonly sub: string;
  readonly role: Role;
  readonly name: string;
}

export type SessionRequest = Request & { session?: Session | null };

const ROLES: readonly Role[] = ["admin", "agent", "user"];

/**
 * Global guard: resolves the bearer token into a domain Session (or null for visitors).
 * Authorisation itself lives in the application layer (requireStaff, requireAdmin, scopes).
 */
@Injectable()
export class SessionGuard implements CanActivate {
  constructor(
    @Inject(JwtService) private readonly jwt: JwtService,
    @Inject(AUTH_GATEWAY) private readonly auth: AuthGateway,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<SessionRequest>();
    const header = request.headers.authorization;
    request.session = null;
    if (!header) return true;

    const [scheme, token] = header.split(" ");
    if (scheme !== "Bearer" || !token) throw new UnauthorizedException("Session invalide.");
    let payload: TokenPayload;
    try {
      payload = await this.jwt.verifyAsync<TokenPayload>(token, { algorithms: ["HS256"] });
      if (!ROLES.includes(payload.role)) throw new Error("role");
    } catch {
      throw new UnauthorizedException("Session expirée. Reconnectez-vous.");
    }
    // The token only proves who the caller is: the role is read from the database so a demotion or a deactivation applies at once.
    const current = await this.auth.sessionOf(payload.sub);
    if (!current) throw new UnauthorizedException("Compte désactivé ou introuvable.");
    request.session = current;
    return true;
  }
}

export const CurrentSession = createParamDecorator((_data: unknown, context: ExecutionContext): Session | null => {
  return context.switchToHttp().getRequest<SessionRequest>().session ?? null;
});
