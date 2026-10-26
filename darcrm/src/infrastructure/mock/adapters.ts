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
import type { PublicUser } from "@/domain/account/account";
import type { ManagedAccount, NewStaffAccount, StaffAccountRole } from "@/domain/account/managed-account";
import type { Agent } from "@/domain/agent/agent";
import type { TemplateKey, TemplateOverride } from "@/domain/message/template";
import type { Task } from "@/domain/task/task";
import type { StaffScope } from "@/domain/auth/session";
import { canAccess } from "@/domain/auth/session";
import { matchesFilters, sortListings, type SearchQuery } from "@/domain/listing/filters";
import { isPubliclyVisible, toPublicListing, type PublicListing } from "@/domain/listing/listing";
import { newId } from "@/domain/shared/id";
import type { InquiryInput } from "@/application/public/create-inquiry";
import { EMPTY_CRITERIA, type Lead } from "@/domain/lead/lead";
import { fail, ok, type Result } from "@/domain/shared/result";
import { getStore, type MockStore } from "./store";

const byScope = <T extends { agentId: string }>(items: readonly T[], scope: StaffScope): T[] =>
  items.filter((item) => canAccess(scope, item.agentId));

const includesText = (haystack: string[], needle: string) =>
  haystack.some((value) => value.toLowerCase().includes(needle.toLowerCase()));

export class MockAuthGateway implements AuthGateway {
  constructor(private readonly store: () => MockStore = getStore) {}

  async login(email: string, password: string) {
    const credential = this.store().credentials.find((item) => item.email === email && item.password === password && item.active !== false);
    return credential?.session ?? null;
  }

  async registerUser(input: { fullName: string; email: string; phone: string; password: string }) {
    const store = this.store();
    if (store.credentials.some((item) => item.email === input.email)) {
      return fail("Un compte existe déjà avec cet e-mail.", { email: "E-mail déjà utilisé." });
    }
    const id = newId("user");
    const session = { userId: id, role: "user" as const, displayName: input.fullName.trim() };
    store.users.push({ id, fullName: session.displayName, email: input.email, phone: input.phone });
    store.credentials.push({ email: input.email, password: input.password, session });
    return ok(session);
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const store = this.store();
    const credential = store.credentials.find((item) => item.session.userId === userId);
    if (!credential || credential.password !== currentPassword) {
      return fail("Mot de passe actuel incorrect.", { currentPassword: "Mot de passe actuel incorrect." });
    }
    store.credentials = store.credentials.map((item) => (item === credential ? { ...item, password: newPassword } : item));
    return ok(true as const);
  }

  async rename(userId: string, displayName: string) {
    const store = this.store();
    store.credentials = store.credentials.map((item) => (item.session.userId === userId ? { ...item, session: { ...item.session, displayName } } : item));
  }
}

export class MockAccountDirectory implements AccountDirectory {
  constructor(private readonly store: () => MockStore = getStore) {}

  async list(): Promise<ManagedAccount[]> {
    const { credentials, users, agents } = this.store();
    const phoneOf = new Map<string, string>([...users, ...agents].map((profile) => [profile.id, profile.phone]));
    return credentials.map((credential) => ({
      id: credential.session.userId,
      fullName: credential.session.displayName,
      email: credential.email,
      phone: phoneOf.get(credential.session.userId) ?? "",
      role: credential.session.role,
      active: credential.active !== false,
    }));
  }

  async find(id: string) {
    return (await this.list()).find((account) => account.id === id) ?? null;
  }

  async createStaff(input: NewStaffAccount): Promise<Result<ManagedAccount>> {
    const store = this.store();
    if (store.credentials.some((item) => item.email === input.email)) return fail("Un compte existe déjà avec cet e-mail.", { email: "E-mail déjà utilisé." });
    const id = newId("agent");
    store.agents.push({
      id, agencyId: store.agency.id, role: input.role, fullName: input.fullName, firstName: input.fullName.split(" ")[0] ?? input.fullName,
      jobTitle: input.jobTitle, avatarUrl: "", phone: input.phone, whatsapp: input.phone, email: input.email, defaultCommissionRate: 3,
    });
    store.credentials.push({ email: input.email, password: input.password, session: { userId: id, role: input.role, displayName: input.fullName } });
    return ok({ id, fullName: input.fullName, email: input.email, phone: input.phone, role: input.role, active: true });
  }

  async setRole(id: string, role: StaffAccountRole) {
    const store = this.store();
    store.credentials = store.credentials.map((item) => (item.session.userId === id ? { ...item, session: { ...item.session, role } } : item));
    store.agents = store.agents.map((agent) => (agent.id === id ? { ...agent, role } : agent));
  }

  async setActive(id: string, active: boolean) {
    const store = this.store();
    store.credentials = store.credentials.map((item) => (item.session.userId === id ? { ...item, active } : item));
  }
}

export class MockAgencyRepository implements AgencyRepository {
  constructor(private readonly store: () => MockStore = getStore) {}
  async get() {
    return this.store().agency;
  }
  async save(agency: MockStore["agency"]) {
    this.store().agency = agency;
  }
}

export class MockAgentRepository implements AgentRepository {
  constructor(private readonly store: () => MockStore = getStore) {}
  async list() {
    return [...this.store().agents];
  }
  async findById(id: string) {
    return this.store().agents.find((agent) => agent.id === id) ?? null;
  }
  async save(agent: Agent) {
    const store = this.store();
    store.agents = store.agents.map((existing) => (existing.id === agent.id ? agent : existing));
  }
}

export class MockUserRepository implements UserRepository {
  constructor(private readonly store: () => MockStore = getStore) {}
  async findById(id: string) {
    return this.store().users.find((user) => user.id === id) ?? null;
  }
  async save(user: PublicUser) {
    const store = this.store();
    store.users = store.users.map((existing) => (existing.id === user.id ? user : existing));
  }
}

export class MockListingRepository implements ListingRepository {
  constructor(private readonly store: () => MockStore = getStore) {}

  async list(scope: StaffScope, query: CrmListingQuery) {
    return byScope(this.store().listings, scope)
      .filter((listing) => !query.ref || listing.ref === query.ref)
      .filter((listing) => !query.status || listing.status === query.status)
      .filter((listing) => !query.visibility || listing.visibility === query.visibility)
      .filter((listing) => !query.transaction || listing.transaction === query.transaction)
      .filter((listing) => !query.agentId || listing.agentId === query.agentId)
      .filter((listing) => !query.q || includesText([listing.title, listing.ref, listing.district, listing.internal.ownerName], query.q))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async findById(id: string) {
    return this.store().listings.find((listing) => listing.id === id) ?? null;
  }

  async findByRef(ref: string) {
    return this.store().listings.find((listing) => listing.ref === ref) ?? null;
  }

  async nextRef() {
    const store = this.store();
    store.refCounter += 1;
    return `REF-${store.refCounter}`;
  }

  async save(listing: MockStore["listings"][number]) {
    const store = this.store();
    const index = store.listings.findIndex((item) => item.id === listing.id);
    if (index === -1) store.listings.push(listing);
    else store.listings[index] = listing;
    return listing;
  }

  async remove(id: string) {
    const store = this.store();
    store.listings = store.listings.filter((listing) => listing.id !== id);
    for (const ids of store.favorites.values()) ids.delete(id);
  }
}

/** Same store as the CRM, but only ever returns the public projection of published + available listings. */
export class MockPublicListingRepository implements PublicListingRepository {
  constructor(private readonly store: () => MockStore = getStore) {}

  private visible(): PublicListing[] {
    return this.store().listings.filter(isPubliclyVisible).map(toPublicListing);
  }

  async search(query: SearchQuery) {
    const matching = sortListings(this.visible().filter((listing) => matchesFilters(listing, query.filters)), query.sort);
    const start = (query.page - 1) * query.pageSize;
    return { items: matching.slice(start, start + query.pageSize), total: matching.length, page: query.page, pageSize: query.pageSize };
  }

  async findBySlug(slug: string) {
    return this.visible().find((listing) => listing.slug === slug) ?? null;
  }

  async findByIds(ids: readonly string[]) {
    return this.visible().filter((listing) => ids.includes(listing.id));
  }

  async featured(limit: number) {
    return sortListings(this.visible(), "recent").slice(0, limit);
  }

  async similarTo(slug: string, limit: number) {
    const current = await this.findBySlug(slug);
    if (!current) return [];
    return this.visible()
      .filter((listing) => listing.slug !== slug && listing.transaction === current.transaction)
      .map((listing) => ({
        listing,
        score: (listing.cityId === current.cityId ? 2 : 0) + (listing.propertyType === current.propertyType ? 1 : 0),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((entry) => entry.listing);
  }

  async cityCounts(): Promise<CityCount[]> {
    const counts = new Map<string, number>();
    for (const listing of this.visible()) counts.set(listing.cityId, (counts.get(listing.cityId) ?? 0) + 1);
    return [...counts.entries()].map(([cityId, count]) => ({ cityId, count })).sort((a, b) => b.count - a.count);
  }
}

export class MockLeadRepository implements LeadRepository {
  constructor(private readonly store: () => MockStore = getStore) {}

  async list(scope: StaffScope, query: LeadQuery) {
    return byScope(this.store().leads, scope)
      .filter((lead) => !query.stage || lead.stage === query.stage)
      .filter((lead) => !query.agentId || lead.agentId === query.agentId)
      .filter((lead) => !query.q || includesText([lead.fullName, lead.phone, lead.email], query.q))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async findById(id: string) {
    return this.store().leads.find((lead) => lead.id === id) ?? null;
  }

  async create(lead: MockStore["leads"][number]) {
    this.store().leads.push(lead);
    return lead;
  }

  async save(lead: MockStore["leads"][number]) {
    const store = this.store();
    store.leads = store.leads.map((item) => (item.id === lead.id ? lead : item));
  }

  async listActivities(leadId: string) {
    return this.store().activities.filter((activity) => activity.leadId === leadId);
  }

  async addActivity(activity: MockStore["activities"][number]) {
    this.store().activities.push(activity);
  }
}

export class MockAppointmentRepository implements AppointmentRepository {
  constructor(private readonly store: () => MockStore = getStore) {}

  async list(scope: StaffScope, range: { from: Date; to: Date }) {
    return byScope(this.store().appointments, scope).filter((appointment) => {
      const start = new Date(appointment.startsAt);
      return start >= range.from && start < range.to;
    });
  }

  async listForLead(leadId: string) {
    return this.store().appointments.filter((appointment) => appointment.leadId === leadId);
  }

  async findById(id: string) {
    return this.store().appointments.find((appointment) => appointment.id === id) ?? null;
  }

  async create(appointment: MockStore["appointments"][number]) {
    this.store().appointments.push(appointment);
  }

  async save(appointment: MockStore["appointments"][number]) {
    const store = this.store();
    store.appointments = store.appointments.map((item) => (item.id === appointment.id ? appointment : item));
  }
}

export class MockDealRepository implements DealRepository {
  constructor(private readonly store: () => MockStore = getStore) {}

  async list(scope: StaffScope, range?: { from: Date; to: Date }) {
    return byScope(this.store().deals, scope).filter((deal) => {
      if (!range) return true;
      const closed = new Date(deal.closedAt);
      return closed >= range.from && closed < range.to;
    });
  }

  async create(deal: MockStore["deals"][number]) {
    this.store().deals.push(deal);
  }
}

export class MockAccountRepository implements AccountRepository {
  constructor(private readonly store: () => MockStore = getStore) {}

  async listFavoriteIds(userId: string) {
    return [...(this.store().favorites.get(userId) ?? [])];
  }

  async addFavorite(userId: string, listingId: string) {
    const favorites = this.store().favorites;
    favorites.set(userId, (favorites.get(userId) ?? new Set()).add(listingId));
  }

  async removeFavorite(userId: string, listingId: string) {
    this.store().favorites.get(userId)?.delete(listingId);
  }

  async listSavedSearches(userId: string) {
    return this.store().savedSearches.filter((search) => search.userId === userId);
  }

  async listAllSavedSearches() {
    return [...this.store().savedSearches];
  }

  async saveSearch(search: MockStore["savedSearches"][number]) {
    const store = this.store();
    const exists = store.savedSearches.some((item) => item.id === search.id);
    store.savedSearches = exists ? store.savedSearches.map((item) => (item.id === search.id ? search : item)) : [...store.savedSearches, search];
  }

  async deleteSearch(userId: string, searchId: string) {
    const store = this.store();
    store.savedSearches = store.savedSearches.filter((search) => !(search.id === searchId && search.userId === userId));
  }

  async listAlerts(userId: string) {
    return this.store().alerts.filter((alert) => alert.userId === userId).sort((a, b) => b.sentAt.localeCompare(a.sentAt));
  }

  async recordAlert(alert: MockStore["alerts"][number]) {
    this.store().alerts.push(alert);
  }
}

export class MockTaskRepository implements TaskRepository {
  constructor(private readonly store: () => MockStore = getStore) {}
  async list(scope: StaffScope, query: TaskQuery) {
    return this.store().tasks.filter(
      (task) => canAccess(scope, task.agentId) && (query.leadId === undefined || task.leadId === query.leadId) && (query.includeDone || task.doneAt === null),
    );
  }
  async findById(id: string) {
    return this.store().tasks.find((task) => task.id === id) ?? null;
  }
  async create(task: Task) {
    this.store().tasks.push(task);
    return task;
  }
  async save(task: Task) {
    const store = this.store();
    store.tasks = store.tasks.map((existing) => (existing.id === task.id ? task : existing));
  }
}

export class MockTemplateRepository implements TemplateRepository {
  constructor(private readonly store: () => MockStore = getStore) {}
  async list() {
    return [...this.store().templates];
  }
  async save(override: TemplateOverride) {
    const store = this.store();
    store.templates = [...store.templates.filter((existing) => existing.key !== override.key), override];
  }
  async remove(key: TemplateKey) {
    const store = this.store();
    store.templates = store.templates.filter((existing) => existing.key !== key);
  }
}

export class MockNotificationRepository implements NotificationRepository {
  constructor(private readonly store: () => MockStore = getStore) {}

  async listFor(userId: string) {
    return this.store().notifications.filter((notification) => notification.userId === userId);
  }

  async add(notification: MockStore["notifications"][number]) {
    this.store().notifications.push(notification);
  }

  async markAllRead(userId: string) {
    const store = this.store();
    store.notifications = store.notifications.map((item) => (item.userId === userId ? { ...item, read: true } : item));
  }
}

/** Mock stand-in for POST /public/listings/{slug}/inquiries: what the real backend does server-side. */
export class MockInquiryGateway implements InquiryGateway {
  constructor(private readonly store: () => MockStore = getStore) {}

  async create(slug: string, input: InquiryInput): Promise<Result<{ leadId: string }>> {
    const store = this.store();
    const listing = store.listings.filter(isPubliclyVisible).find((candidate) => candidate.slug === slug);
    if (!listing) return fail("Cette annonce n'est plus disponible.");

    const timestamp = new Date().toISOString();
    const lead: Lead = {
      id: newId("lead"),
      agencyId: store.agency.id,
      agentId: listing.agentId,
      fullName: input.fullName.trim(),
      phone: input.phone.trim(),
      email: input.email.trim(),
      source: "website",
      stage: "new",
      lostReason: null,
      listingId: listing.id,
      message: input.message.trim(),
      criteria: { ...EMPTY_CRITERIA, transaction: listing.transaction, propertyTypes: [listing.propertyType], cityIds: [listing.cityId] },
      createdAt: timestamp,
      updatedAt: timestamp,
      lastContactAt: null,
    };
    store.leads.push(lead);
    store.notifications.push({
      id: newId("ntf"),
      userId: listing.agentId,
      kind: "new_lead",
      title: `Nouvelle demande : ${lead.fullName}`,
      body: `${listing.ref} · ${listing.title}`,
      href: `/crm/prospects/${lead.id}`,
      at: timestamp,
      read: false,
    });
    return ok({ leadId: lead.id });
  }
}

/** Mock: nothing is sent; the dispatch is recorded by the use case and shown in the visitor's account. */
export class MockAlertGateway implements AlertGateway {
  async sendWhatsapp(input: { to: string; text: string }) {
    console.info(`[mock whatsapp] -> ${input.to}: ${input.text}`);
  }
}
