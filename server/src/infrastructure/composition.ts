import type { AlertGateway, Deps } from "../application/ports";
import type { Database } from "./persistence/database";
import { CollectionAccountRepository } from "./persistence/repositories/account";
import { CollectionAccountDirectory, type CollectionAuthGateway } from "./persistence/repositories/auth";
import {
  CollectionAgencyRepository,
  CollectionAgentRepository,
  CollectionListingRepository,
  CollectionPublicListingRepository,
  CollectionUserRepository,
} from "./persistence/repositories/catalog";
import { CollectionAppointmentRepository, CollectionDealRepository, CollectionLeadRepository, CollectionNotificationRepository, CollectionReminderRepository, CollectionTaskRepository, CollectionTemplateRepository } from "./persistence/repositories/crm";

export function buildDeps(db: Database, auth: CollectionAuthGateway, alerts: AlertGateway): Deps {
  return {
    auth,
    directory: new CollectionAccountDirectory(db),
    agency: new CollectionAgencyRepository(db),
    agents: new CollectionAgentRepository(db),
    users: new CollectionUserRepository(db),
    listings: new CollectionListingRepository(db),
    publicListings: new CollectionPublicListingRepository(db),
    leads: new CollectionLeadRepository(db),
    appointments: new CollectionAppointmentRepository(db),
    deals: new CollectionDealRepository(db),
    accounts: new CollectionAccountRepository(db),
    notifications: new CollectionNotificationRepository(db),
    tasks: new CollectionTaskRepository(db),
    templates: new CollectionTemplateRepository(db),
    reminders: new CollectionReminderRepository(db),
    alerts,
  };
}
