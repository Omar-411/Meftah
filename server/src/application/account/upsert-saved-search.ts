import type { SavedSearch } from "../../domain/account/account";
import type { Session } from "../../domain/auth/session";
import type { Result } from "../../domain/shared/result";
import { ForbiddenError } from "../errors";
import { requireUser } from "../guards";
import type { Deps } from "../ports";
import { saveSearch, updateSavedSearchAlerts, type SaveSearchInput } from "./account";

/** Idempotent PUT: the client chooses the id, so make sure it never overwrites someone else's search. */
export async function upsertSavedSearch(
  deps: Pick<Deps, "accounts">,
  session: Session | null,
  input: SaveSearchInput & { id: string },
  now: Date,
): Promise<Result<SavedSearch>> {
  const user = requireUser(session);
  const all = await deps.accounts.listAllSavedSearches();
  const existing = all.find((search) => search.id === input.id);
  if (existing && existing.userId !== user.userId) throw new ForbiddenError();
  if (existing) return updateSavedSearchAlerts(deps, session, input.id, input.whatsappAlerts, input.whatsappPhone);
  return saveSearch(deps, session, input, now);
}
