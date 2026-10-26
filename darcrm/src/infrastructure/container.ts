import type { Deps } from "@/application/ports";
import {
  HttpAccountDirectory,
  HttpAccountRepository,
  HttpAgencyRepository,
  HttpAgentRepository,
  HttpAlertGateway,
  HttpAppointmentRepository,
  HttpAuthGateway,
  HttpDealRepository,
  HttpInquiryGateway,
  HttpLeadRepository,
  HttpListingRepository,
  HttpNotificationRepository,
  HttpPublicListingRepository,
  HttpTaskRepository,
  HttpTemplateRepository,
  HttpUserRepository,
} from "./http/adapters";
import { createHttpClient } from "./http/client";
import {
  MockAccountDirectory,
  MockAccountRepository,
  MockAgencyRepository,
  MockAgentRepository,
  MockAlertGateway,
  MockAppointmentRepository,
  MockAuthGateway,
  MockDealRepository,
  MockInquiryGateway,
  MockLeadRepository,
  MockListingRepository,
  MockNotificationRepository,
  MockPublicListingRepository,
  MockTaskRepository,
  MockTemplateRepository,
  MockUserRepository,
} from "./mock/adapters";
import { readSession } from "./session";

function createMockDeps(): Deps {
  return {
    auth: new MockAuthGateway(),
    directory: new MockAccountDirectory(),
    agency: new MockAgencyRepository(),
    agents: new MockAgentRepository(),
    users: new MockUserRepository(),
    listings: new MockListingRepository(),
    publicListings: new MockPublicListingRepository(),
    leads: new MockLeadRepository(),
    appointments: new MockAppointmentRepository(),
    deals: new MockDealRepository(),
    accounts: new MockAccountRepository(),
    notifications: new MockNotificationRepository(),
    tasks: new MockTaskRepository(),
    templates: new MockTemplateRepository(),
    inquiries: new MockInquiryGateway(),
    alerts: new MockAlertGateway(),
  };
}

function createHttpDeps(baseUrl: string): Deps {
  const http = createHttpClient({ baseUrl, getToken: async () => (await readSession())?.accessToken ?? null });
  return {
    auth: new HttpAuthGateway(http),
    directory: new HttpAccountDirectory(http),
    agency: new HttpAgencyRepository(http),
    agents: new HttpAgentRepository(http),
    users: new HttpUserRepository(http),
    listings: new HttpListingRepository(http),
    publicListings: new HttpPublicListingRepository(http),
    leads: new HttpLeadRepository(http),
    appointments: new HttpAppointmentRepository(http),
    deals: new HttpDealRepository(http),
    accounts: new HttpAccountRepository(http),
    notifications: new HttpNotificationRepository(http),
    tasks: new HttpTaskRepository(http),
    templates: new HttpTemplateRepository(http),
    inquiries: new HttpInquiryGateway(http),
    alerts: new HttpAlertGateway(),
  };
}

/**
 * Composition root. API_MODE=mock (default) uses the in-memory demo backend;
 * API_MODE=http talks to API_BASE_URL. Nothing else in the app knows which one is active.
 */
export function getDeps(): Deps {
  if (process.env.API_MODE === "http") {
    const baseUrl = process.env.API_BASE_URL;
    if (!baseUrl) throw new Error("API_BASE_URL est requis quand API_MODE=http.");
    return createHttpDeps(baseUrl);
  }
  return createMockDeps();
}
