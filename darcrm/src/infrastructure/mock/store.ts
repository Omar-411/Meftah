import type { AlertDispatch, CrmNotification, PublicUser, SavedSearch } from "@/domain/account/account";
import type { AgencySettings } from "@/domain/agency/agency";
import type { Agent } from "@/domain/agent/agent";
import type { Appointment } from "@/domain/appointment/appointment";
import type { Session } from "@/domain/auth/session";
import type { Deal } from "@/domain/deal/deal";
import type { Listing } from "@/domain/listing/listing";
import type { Activity, Lead } from "@/domain/lead/lead";
import type { TemplateOverride } from "@/domain/message/template";
import type { Task } from "@/domain/task/task";
import { createSeed } from "./seed";

export interface Credential {
  readonly email: string;
  readonly password: string;
  readonly session: Session;
  /** Missing means active. */
  readonly active?: boolean;
}

export interface MockStore {
  agency: AgencySettings;
  agents: Agent[];
  users: PublicUser[];
  credentials: Credential[];
  listings: Listing[];
  leads: Lead[];
  activities: Activity[];
  appointments: Appointment[];
  deals: Deal[];
  favorites: Map<string, Set<string>>;
  savedSearches: SavedSearch[];
  alerts: AlertDispatch[];
  notifications: CrmNotification[];
  tasks: Task[];
  templates: TemplateOverride[];
  refCounter: number;
}

const globalForStore = globalThis as typeof globalThis & { __darcrmStore?: MockStore };

/** One store per server process, kept on globalThis so it survives hot reloads. Resets on restart. */
export function getStore(): MockStore {
  globalForStore.__darcrmStore ??= createSeed(new Date());
  return globalForStore.__darcrmStore;
}
