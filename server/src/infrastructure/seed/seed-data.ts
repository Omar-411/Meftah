import type { AlertDispatch, CrmNotification, PublicUser, SavedSearch } from "../../domain/account/account";
import type { AgencySettings } from "../../domain/agency/agency";
import type { Agent } from "../../domain/agent/agent";
import type { Appointment } from "../../domain/appointment/appointment";
import type { Session } from "../../domain/auth/session";
import type { Deal } from "../../domain/deal/deal";
import type { Listing } from "../../domain/listing/listing";
import type { Activity, Lead } from "../../domain/lead/lead";
import type { Task } from "../../domain/task/task";

export interface SeedCredential {
  readonly email: string;
  readonly password: string;
  readonly session: Session;
}

/** Demo dataset used to populate an empty database. */
export interface SeedData {
  agency: AgencySettings;
  agents: Agent[];
  users: PublicUser[];
  credentials: SeedCredential[];
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
  refCounter: number;
}
