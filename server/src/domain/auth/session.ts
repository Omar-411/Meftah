export type Role = "admin" | "agent" | "user";
export type StaffRole = Exclude<Role, "user">;

export interface Session {
  readonly userId: string;
  readonly role: Role;
  readonly displayName: string;
  /** Bearer token from the real backend (API_MODE=http). Never sent to the browser; kept in an httpOnly cookie. */
  readonly accessToken?: string;
}

export interface StaffSession extends Session {
  readonly role: StaffRole;
}

/** What a staff member is allowed to see: everything (admin) or only their own records (agent). */
export type StaffScope =
  | { readonly kind: "all" }
  | { readonly kind: "agent"; readonly agentId: string };

export function isStaff(session: Session | null): session is StaffSession {
  return session !== null && (session.role === "admin" || session.role === "agent");
}

export function scopeOf(session: StaffSession): StaffScope {
  return session.role === "admin" ? { kind: "all" } : { kind: "agent", agentId: session.userId };
}

export function canAccess(scope: StaffScope, ownerAgentId: string): boolean {
  return scope.kind === "all" || scope.agentId === ownerAgentId;
}

export const ROLE_LABELS: Record<Role, string> = {
  admin: "Administrateur",
  agent: "Agent",
  user: "Utilisateur",
};
