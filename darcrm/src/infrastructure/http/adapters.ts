/**
 * HTTP adapters: the backend hand-off point.
 *
 * Each method calls the endpoint listed in docs/API_CONTRACT.md. They assume the backend returns JSON shaped
 * like the domain types (src/domain/**). If your API differs, map it inside the adapter method (see the
 * `TODO(backend)` markers) and leave the rest of the app untouched.
 *
 * Enable with API_MODE=http and API_BASE_URL=https://your-api.example.com
 */
import type {
  AccountDirectory,
  AccountRepository,
  AgencyRepository,
  AgentRepository,
  AlertGateway,
  AppointmentRepository,
  AuthGateway,
  CityCount,
  CrmListingQuery,
  DateRange,
  DealRepository,
  InquiryGateway,
  LeadQuery,
  LeadRepository,
  ListingRepository,
  NotificationRepository,
  PublicListingRepository,
  TaskQuery,
  TaskRepository,
  TemplateRepository,
  UserRepository,
} from "@/application/ports";
import type { AlertDispatch, CrmNotification, PublicUser, SavedSearch } from "@/domain/account/account";
import type { ManagedAccount, NewStaffAccount, StaffAccountRole } from "@/domain/account/managed-account";
import type { AgencySettings } from "@/domain/agency/agency";
import type { Agent } from "@/domain/agent/agent";
import type { Appointment } from "@/domain/appointment/appointment";
import type { Session, StaffScope } from "@/domain/auth/session";
import type { Deal } from "@/domain/deal/deal";
import type { SearchQuery } from "@/domain/listing/filters";
import type { Listing, PublicListing } from "@/domain/listing/listing";
import type { InquiryInput } from "@/application/public/create-inquiry";
import type { Activity, Lead } from "@/domain/lead/lead";
import type { TemplateKey, TemplateOverride } from "@/domain/message/template";
import type { Task } from "@/domain/task/task";
import { fail, ok, type Page, type Result } from "@/domain/shared/result";
import { ApiError, type HttpClient } from "./client";
import { ENDPOINTS } from "./endpoints";

const scopeQuery = (scope: StaffScope) => (scope.kind === "agent" ? { agentId: scope.agentId } : {});
const rangeQuery = (range?: DateRange) => (range ? { from: range.from.toISOString(), to: range.to.toISOString() } : {});

interface LoginResponse {
  token: string;
  user: { id: string; fullName: string; role: Session["role"] };
}

export class HttpAuthGateway implements AuthGateway {
  constructor(private readonly http: HttpClient) {}

  private toSession(response: LoginResponse): Session {
    return { userId: response.user.id, role: response.user.role, displayName: response.user.fullName, accessToken: response.token };
  }

  async login(email: string, password: string) {
    try {
      return this.toSession(await this.http.post<LoginResponse>(ENDPOINTS.auth.login, { email, password }));
    } catch (error) {
      if (error instanceof ApiError && (error.status === 401 || error.status === 400)) return null;
      throw error;
    }
  }

  async registerUser(input: { fullName: string; email: string; phone: string; password: string }): Promise<Result<Session>> {
    try {
      return ok(this.toSession(await this.http.post<LoginResponse>(ENDPOINTS.auth.register, input)));
    } catch (error) {
      if (error instanceof ApiError && error.status < 500) return fail(error.message, error.fields);
      throw error;
    }
  }

  async changePassword(_userId: string, currentPassword: string, newPassword: string): Promise<Result<true>> {
    try {
      await this.http.post(ENDPOINTS.me.password, { currentPassword, newPassword });
      return ok(true);
    } catch (error) {
      if (error instanceof ApiError && error.status < 500) return fail(error.message, error.fields);
      throw error;
    }
  }

  async rename(): Promise<void> {
    // Backend-owned: PUT me/profile already updates the credential's display name.
  }
}

export class HttpAccountDirectory implements AccountDirectory {
  constructor(private readonly http: HttpClient) {}
  list() {
    return this.http.get<ManagedAccount[]>(ENDPOINTS.crm.users);
  }
  async find(id: string) {
    return (await this.list()).find((account) => account.id === id) ?? null;
  }
  async createStaff(input: NewStaffAccount): Promise<Result<ManagedAccount>> {
    try {
      return ok(await this.http.post<ManagedAccount>(ENDPOINTS.crm.users, input));
    } catch (error) {
      if (error instanceof ApiError && error.status < 500 && error.status !== 401 && error.status !== 403) return fail(error.message, error.fields);
      throw error;
    }
  }
  async setRole(id: string, role: StaffAccountRole) {
    await this.http.patch(`${ENDPOINTS.crm.users}/${id}/role`, { role });
  }
  async setActive(id: string, active: boolean) {
    await this.http.patch(`${ENDPOINTS.crm.users}/${id}/active`, { active });
  }
}

export class HttpAgencyRepository implements AgencyRepository {
  constructor(private readonly http: HttpClient) {}
  get() {
    return this.http.get<AgencySettings>(ENDPOINTS.agency);
  }
  async save(agency: AgencySettings) {
    await this.http.put(ENDPOINTS.crm.agencySettings, agency);
  }
}

export class HttpAgentRepository implements AgentRepository {
  constructor(private readonly http: HttpClient) {}
  list() {
    return this.http.get<Agent[]>(ENDPOINTS.agents);
  }
  async save(agent: Agent) {
    // One endpoint for every role; the backend applies it to the token's own record.
    await this.http.put(ENDPOINTS.me.profile, { fullName: agent.fullName, phone: agent.phone, whatsapp: agent.whatsapp, jobTitle: agent.jobTitle });
  }
  async findById(id: string) {
    try {
      return await this.http.get<Agent>(`${ENDPOINTS.agents}/${id}`);
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) return null;
      throw error;
    }
  }
}

export class HttpUserRepository implements UserRepository {
  constructor(private readonly http: HttpClient) {}
  async save(user: PublicUser) {
    await this.http.put(ENDPOINTS.me.profile, { fullName: user.fullName, phone: user.phone });
  }
  async findById(_id: string) {
    // The backend resolves the user from the token; the id argument only exists for the mock.
    try {
      return await this.http.get<PublicUser>(ENDPOINTS.me.profile);
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) return null;
      throw error;
    }
  }
}

export class HttpListingRepository implements ListingRepository {
  constructor(private readonly http: HttpClient) {}

  list(scope: StaffScope, query: CrmListingQuery) {
    return this.http.get<Listing[]>(ENDPOINTS.crm.listings, { ...scopeQuery(scope), ...query });
  }
  async findById(id: string) {
    try {
      return await this.http.get<Listing>(`${ENDPOINTS.crm.listings}/${id}`);
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) return null;
      throw error;
    }
  }
  async findByRef(ref: string) {
    const matches = await this.http.get<Listing[]>(ENDPOINTS.crm.listings, { ref });
    return matches[0] ?? null;
  }
  async nextRef() {
    // The backend assigns `ref` (and `slug`) on create; this placeholder is replaced server-side.
    return "";
  }
  save(listing: Listing) {
    // A new listing has no ref yet (nextRef returns ""), even though the use case already generated a client-side id.
    return listing.ref
      ? this.http.put<Listing>(`${ENDPOINTS.crm.listings}/${listing.id}`, listing)
      : this.http.post<Listing>(ENDPOINTS.crm.listings, listing);
  }
  async remove(id: string) {
    await this.http.delete(`${ENDPOINTS.crm.listings}/${id}`);
  }
}

export class HttpPublicListingRepository implements PublicListingRepository {
  constructor(private readonly http: HttpClient) {}

  search(query: SearchQuery) {
    return this.http.get<Page<PublicListing>>(ENDPOINTS.public.listings, {
      transaction: query.filters.transaction,
      cityId: query.filters.cityId,
      propertyType: query.filters.propertyType,
      priceMin: query.filters.priceMin,
      priceMax: query.filters.priceMax,
      minRooms: query.filters.minRooms,
      minArea: query.filters.minArea,
      sort: query.sort,
      page: query.page,
      pageSize: query.pageSize,
    });
  }
  async findBySlug(slug: string) {
    try {
      return await this.http.get<PublicListing>(`${ENDPOINTS.public.listings}/${slug}`);
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) return null;
      throw error;
    }
  }
  findByIds(ids: readonly string[]) {
    return ids.length === 0 ? Promise.resolve([]) : this.http.get<PublicListing[]>(ENDPOINTS.public.listingsByIds, { ids: ids.join(",") });
  }
  featured(limit: number) {
    return this.http.get<PublicListing[]>(ENDPOINTS.public.featured, { limit });
  }
  similarTo(slug: string, limit: number) {
    return this.http.get<PublicListing[]>(`${ENDPOINTS.public.listings}/${slug}/similar`, { limit });
  }
  cityCounts() {
    return this.http.get<CityCount[]>(ENDPOINTS.public.cities);
  }
}

export class HttpLeadRepository implements LeadRepository {
  constructor(private readonly http: HttpClient) {}

  list(scope: StaffScope, query: LeadQuery) {
    return this.http.get<Lead[]>(ENDPOINTS.crm.leads, { ...scopeQuery(scope), ...query });
  }
  async findById(id: string) {
    try {
      return await this.http.get<Lead>(`${ENDPOINTS.crm.leads}/${id}`);
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) return null;
      throw error;
    }
  }
  create(lead: Lead) {
    return this.http.post<Lead>(ENDPOINTS.crm.leads, lead);
  }
  async save(lead: Lead) {
    await this.http.put(`${ENDPOINTS.crm.leads}/${lead.id}`, lead);
  }
  listActivities(leadId: string) {
    return this.http.get<Activity[]>(`${ENDPOINTS.crm.leads}/${leadId}/activities`);
  }
  async addActivity(activity: Activity) {
    await this.http.post(`${ENDPOINTS.crm.leads}/${activity.leadId}/activities`, activity);
  }
}

export class HttpAppointmentRepository implements AppointmentRepository {
  constructor(private readonly http: HttpClient) {}

  list(scope: StaffScope, range: DateRange) {
    return this.http.get<Appointment[]>(ENDPOINTS.crm.appointments, { ...scopeQuery(scope), ...rangeQuery(range) });
  }
  listForLead(leadId: string) {
    return this.http.get<Appointment[]>(ENDPOINTS.crm.appointments, { leadId });
  }
  async findById(id: string) {
    try {
      return await this.http.get<Appointment>(`${ENDPOINTS.crm.appointments}/${id}`);
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) return null;
      throw error;
    }
  }
  async create(appointment: Appointment) {
    await this.http.post(ENDPOINTS.crm.appointments, appointment);
  }
  async save(appointment: Appointment) {
    await this.http.patch(`${ENDPOINTS.crm.appointments}/${appointment.id}`, appointment);
  }
}

export class HttpDealRepository implements DealRepository {
  constructor(private readonly http: HttpClient) {}
  list(scope: StaffScope, range?: DateRange) {
    return this.http.get<Deal[]>(ENDPOINTS.crm.deals, { ...scopeQuery(scope), ...rangeQuery(range) });
  }
  async create(deal: Deal) {
    await this.http.post(ENDPOINTS.crm.deals, deal);
  }
}

export class HttpAccountRepository implements AccountRepository {
  constructor(private readonly http: HttpClient) {}

  listFavoriteIds(_userId: string) {
    return this.http.get<string[]>(ENDPOINTS.me.favorites);
  }
  async addFavorite(_userId: string, listingId: string) {
    await this.http.put(`${ENDPOINTS.me.favorites}/${listingId}`);
  }
  async removeFavorite(_userId: string, listingId: string) {
    await this.http.delete(`${ENDPOINTS.me.favorites}/${listingId}`);
  }
  listSavedSearches(_userId: string) {
    return this.http.get<SavedSearch[]>(ENDPOINTS.me.savedSearches);
  }
  async listAllSavedSearches() {
    // The backend dispatches alerts itself when a listing is published; the frontend must not read other users' searches.
    return [];
  }
  async saveSearch(search: SavedSearch) {
    // Idempotent upsert: the id is generated client-side, the owner comes from the token.
    await this.http.put(`${ENDPOINTS.me.savedSearches}/${search.id}`, search);
  }
  async deleteSearch(_userId: string, searchId: string) {
    await this.http.delete(`${ENDPOINTS.me.savedSearches}/${searchId}`);
  }
  listAlerts(_userId: string) {
    return this.http.get<AlertDispatch[]>(ENDPOINTS.me.alerts);
  }
  async recordAlert(_alert: AlertDispatch) {
    // Backend-owned: alerts are recorded when the backend sends them.
  }
}

export class HttpTaskRepository implements TaskRepository {
  constructor(private readonly http: HttpClient) {}
  list(_scope: StaffScope, query: TaskQuery) {
    // Scoping is enforced by the token: an agent only ever receives their own tasks.
    return this.http.get<Task[]>(ENDPOINTS.crm.tasks, { leadId: query.leadId, includeDone: query.includeDone ? "true" : undefined });
  }
  async findById(id: string) {
    return (await this.http.get<Task[]>(ENDPOINTS.crm.tasks, { includeDone: "true" })).find((task) => task.id === id) ?? null;
  }
  create(task: Task) {
    return this.http.post<Task>(ENDPOINTS.crm.tasks, { leadId: task.leadId, title: task.title, dueDate: task.dueDate });
  }
  async save(task: Task) {
    await this.http.patch(`${ENDPOINTS.crm.tasks}/${task.id}`, { done: task.doneAt !== null });
  }
}

export class HttpTemplateRepository implements TemplateRepository {
  constructor(private readonly http: HttpClient) {}
  list() {
    return this.http.get<TemplateOverride[]>(ENDPOINTS.crm.templates);
  }
  async save(override: TemplateOverride) {
    await this.http.put(`${ENDPOINTS.crm.templates}/${override.key}`, { body: override.body });
  }
  async remove(key: TemplateKey) {
    await this.http.delete(`${ENDPOINTS.crm.templates}/${key}`);
  }
}

export class HttpNotificationRepository implements NotificationRepository {
  constructor(private readonly http: HttpClient) {}
  listFor(_userId: string) {
    return this.http.get<CrmNotification[]>(ENDPOINTS.crm.notifications);
  }
  async add(_notification: CrmNotification) {
    // Backend-owned: notifications are created server-side (new lead, assignment, reminders).
  }
  async markAllRead(_userId: string) {
    await this.http.patch(`${ENDPOINTS.crm.notifications}/read`);
  }
}

/** Backend-owned: it sends WhatsApp alerts when a listing is published. Nothing to do from the frontend. */
export class HttpAlertGateway implements AlertGateway {
  async sendWhatsapp() {}
}

/** POST /public/listings/{slug}/inquiries: anonymous, creates a lead server-side. */
export class HttpInquiryGateway implements InquiryGateway {
  constructor(private readonly http: HttpClient) {}

  async create(slug: string, input: InquiryInput): Promise<Result<{ leadId: string }>> {
    try {
      return ok(await this.http.post<{ leadId: string }>(`${ENDPOINTS.public.listings}/${slug}/inquiries`, input));
    } catch (error) {
      if (error instanceof ApiError && error.status < 500) return fail(error.message, error.fields);
      throw error;
    }
  }
}
