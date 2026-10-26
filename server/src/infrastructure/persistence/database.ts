/** Minimal document store the repositories are written against. Swap the adapter, not the repositories. */
export interface Collection<T extends { readonly id: string }> {
  all(): Promise<T[]>;
  get(id: string): Promise<T | null>;
  put(document: T): Promise<void>;
  remove(id: string): Promise<void>;
}

export const COLLECTIONS = [
  "agency",
  "agents",
  "users",
  "credentials",
  "listings",
  "leads",
  "activities",
  "appointments",
  "deals",
  "favorites",
  "savedSearches",
  "alerts",
  "notifications",
  "tasks",
  "templates",
  "reminders",
] as const;

export type CollectionName = (typeof COLLECTIONS)[number];

export interface Database {
  collection<T extends { readonly id: string }>(name: CollectionName): Collection<T>;
  /** Atomically increments and returns the counter (starts at `initial` + 1 when the counter does not exist yet). */
  nextCounter(name: string, initial: number): Promise<number>;
  /** Sets the counter only if it does not exist yet (used when seeding). */
  ensureCounter(name: string, value: number): Promise<void>;
  /** Deletes every document and counter. Only for the seed script's explicit reset. */
  reset(): Promise<void>;
  close(): Promise<void>;
}
