import { canAccess, isStaff, scopeOf, type Session, type StaffScope, type StaffSession } from "../domain/auth/session";
import { ForbiddenError } from "./errors";

export function requireStaff(session: Session | null): StaffSession {
  if (!isStaff(session)) throw new ForbiddenError("Connectez-vous avec un compte agence.");
  return session;
}

export function requireAdmin(session: Session | null): StaffSession {
  const staff = requireStaff(session);
  if (staff.role !== "admin") throw new ForbiddenError("Réservé aux administrateurs.");
  return staff;
}

export function requireUser(session: Session | null): Session {
  if (!session || session.role !== "user") throw new ForbiddenError("Connectez-vous pour continuer.");
  return session;
}

export function assertCanAccess(scope: StaffScope, ownerAgentId: string): void {
  if (!canAccess(scope, ownerAgentId)) throw new ForbiddenError();
}

export { scopeOf };
