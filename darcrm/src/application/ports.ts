import type { ManagedAccount, NewStaffAccount, StaffAccountRole } from "@/domain/account/managed-account";
import type { AlertDispatch, CrmNotification, PublicUser, SavedSearch } from "@/domain/account/account";
import type { AgencySettings } from "@/domain/agency/agency";
import type { Agent } from "@/domain/agent/agent";
import type { Appointment } from "@/domain/appointment/appointment";
import type { Session, StaffScope } from "@/domain/auth/session";
import type { Deal } from "@/domain/deal/deal";
import type { ListingStatus, TransactionType, Visibility } from "@/domain/listing/catalog";
import type { SearchQuery } from "@/domain/listing/filters";
import type { Listing, PublicListing } from "@/domain/listing/listing";
import type { Activity, Lead, LeadStage } from "@/domain/lead/lead";
import type { TemplateKey, TemplateOverride } from "@/domain/message/template";
import type { Task } from "@/domain/task/task";
import type { Page, Result } from "@/domain/shared/result";
import type { InquiryInput } from "./public/create-inquiry";

export interface DateRange {
  readonly from: Date;
  readonly to: Date;
}

export interface CityCount {
  readonly cityId: string;
  readonly count: number;
}

export interface AuthGateway {
  login(email: string, password: string): Promise<Session | null>;
  registerUser(input: { fullName: string; email: string; phone: string; password: string }): Promise<Result<Session>>;
  /** Fails with a `currentPassword` field error when the current password is wrong. */
  changePassword(userId: string, currentPassword: string, newPassword: string): Promise<Result<true>>;
  /** Keeps the name shown after the next login in sync with the profile. */
  rename(userId: string, displayName: string): Promise<void>;
}

export interface AccountDirectory {
  list(): Promise<ManagedAccount[]>;
  find(id: string): Promise<ManagedAccount | null>;
  /** Fails with an `email` field error when the address is already used. */
  createStaff(input: NewStaffAccount): Promise<Result<ManagedAccount>>;
  setRole(id: string, role: StaffAccountRole): Promise<void>;
  setActive(id: string, active: boolean): Promise<void>;
}

export interface AgencyRepository {
  get(): Promise<AgencySettings>;
  save(agency: AgencySettings): Promise<void>;
}

export interface AgentRepository {
  list(): Promise<Agent[]>;
  findById(id: string): Promise<Agent | null>;
  save(agent: Agent): Promise<void>;
}

export interface UserRepository {
  findById(id: string): Promise<PublicUser | null>;
  save(user: PublicUser): Promise<void>;
}

export interface CrmListingQuery {
  readonly q?: string;
  /** Exact reference, e.g. REF-1001 (used by the edit page URL). */
  readonly ref?: string;
  readonly status?: ListingStatus;
  readonly visibility?: Visibility;
  readonly transaction?: TransactionType;
  readonly agentId?: string;
}

/** Staff-side access to full listings. The adapter must honour the scope. */
export interface ListingRepository {
  list(scope: StaffScope, query: CrmListingQuery): Promise<Listing[]>;
  findById(id: string): Promise<Listing | null>;
  findByRef(ref: string): Promise<Listing | null>;
  nextRef(): Promise<string>;
  /** Returns the persisted listing: a real backend assigns `ref` and `slug`. */
  save(listing: Listing): Promise<Listing>;
  remove(id: string): Promise<void>;
}

/** Visitor-side read model: only published + available listings, already stripped of internal data. */
export interface PublicListingRepository {
  search(query: SearchQuery): Promise<Page<PublicListing>>;
  findBySlug(slug: string): Promise<PublicListing | null>;
  findByIds(ids: readonly string[]): Promise<PublicListing[]>;
  featured(limit: number): Promise<PublicListing[]>;
  similarTo(slug: string, limit: number): Promise<PublicListing[]>;
  cityCounts(): Promise<CityCount[]>;
}

export interface LeadQuery {
  readonly q?: string;
  readonly stage?: LeadStage;
  readonly agentId?: string;
}

export interface LeadRepository {
  list(scope: StaffScope, query: LeadQuery): Promise<Lead[]>;
  findById(id: string): Promise<Lead | null>;
  /** Returns the persisted lead: a real backend assigns the id. */
  create(lead: Lead): Promise<Lead>;
  save(lead: Lead): Promise<void>;
  listActivities(leadId: string): Promise<Activity[]>;
  addActivity(activity: Activity): Promise<void>;
}

export interface AppointmentRepository {
  list(scope: StaffScope, range: DateRange): Promise<Appointment[]>;
  listForLead(leadId: string): Promise<Appointment[]>;
  findById(id: string): Promise<Appointment | null>;
  create(appointment: Appointment): Promise<void>;
  save(appointment: Appointment): Promise<void>;
}

export interface DealRepository {
  list(scope: StaffScope, range?: DateRange): Promise<Deal[]>;
  create(deal: Deal): Promise<void>;
}

/** Public contact form. Separate from LeadRepository because visitors are anonymous and may not touch CRM routes. */
export interface InquiryGateway {
  create(slug: string, input: InquiryInput): Promise<Result<{ leadId: string }>>;
}

export interface AccountRepository {
  listFavoriteIds(userId: string): Promise<string[]>;
  addFavorite(userId: string, listingId: string): Promise<void>;
  removeFavorite(userId: string, listingId: string): Promise<void>;
  listSavedSearches(userId: string): Promise<SavedSearch[]>;
  /** Used when a listing goes live; a real backend does this server-side. */
  listAllSavedSearches(): Promise<SavedSearch[]>;
  saveSearch(search: SavedSearch): Promise<void>;
  deleteSearch(userId: string, searchId: string): Promise<void>;
  listAlerts(userId: string): Promise<AlertDispatch[]>;
  recordAlert(alert: AlertDispatch): Promise<void>;
}

export interface NotificationRepository {
  listFor(userId: string): Promise<CrmNotification[]>;
  add(notification: CrmNotification): Promise<void>;
  markAllRead(userId: string): Promise<void>;
}

export interface TaskQuery {
  readonly leadId?: string;
  readonly includeDone?: boolean;
}

export interface TaskRepository {
  list(scope: StaffScope, query: TaskQuery): Promise<Task[]>;
  findById(id: string): Promise<Task | null>;
  /** Returns the persisted task: a real backend assigns the id, owner and creation date. */
  create(task: Task): Promise<Task>;
  save(task: Task): Promise<void>;
}

export interface TemplateRepository {
  /** Only the templates the agency customised; the built-in text is applied by the use cases. */
  list(): Promise<TemplateOverride[]>;
  save(override: TemplateOverride): Promise<void>;
  remove(key: TemplateKey): Promise<void>;
}

export interface AlertGateway {
  sendWhatsapp(input: { to: string; text: string }): Promise<void>;
}

export interface Deps {
  readonly auth: AuthGateway;
  readonly directory: AccountDirectory;
  readonly agency: AgencyRepository;
  readonly agents: AgentRepository;
  readonly users: UserRepository;
  readonly listings: ListingRepository;
  readonly publicListings: PublicListingRepository;
  readonly leads: LeadRepository;
  readonly appointments: AppointmentRepository;
  readonly deals: DealRepository;
  readonly accounts: AccountRepository;
  readonly notifications: NotificationRepository;
  readonly tasks: TaskRepository;
  readonly templates: TemplateRepository;
  readonly inquiries: InquiryGateway;
  readonly alerts: AlertGateway;
}
