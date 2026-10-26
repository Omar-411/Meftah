import { listFavoriteIds } from "@/application/account/account";
import { isStaff, type Session } from "@/domain/auth/session";
import { getDeps } from "@/infrastructure/container";
import { readSession } from "@/infrastructure/session";

export interface VisitorContext {
  readonly session: Session | null;
  readonly favoriteIds: ReadonlySet<string>;
  /** Staff accounts don't keep favorites, so the heart is hidden for them. */
  readonly canFavorite: boolean;
}

export async function getVisitorContext(): Promise<VisitorContext> {
  const session = await readSession();
  const favoriteIds = new Set(await listFavoriteIds(getDeps(), session));
  return { session, favoriteIds, canFavorite: session === null || !isStaff(session) };
}

/** Anonymous visitors tapping a heart go to login and return to the page they were on. */
export function loginHrefFor(visitor: VisitorContext, returnTo: string): string | null {
  return visitor.session === null ? `/connexion?next=${encodeURIComponent(returnTo)}` : null;
}
