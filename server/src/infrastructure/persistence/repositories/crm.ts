import type { AppointmentRepository, DealRepository, LeadQuery, LeadRepository, NotificationRepository, ReminderRecord, ReminderRepository, TaskQuery, TaskRepository, TemplateRepository } from "../../../application/ports";
import type { CrmNotification } from "../../../domain/account/account";
import type { Appointment } from "../../../domain/appointment/appointment";
import { canAccess, type StaffScope } from "../../../domain/auth/session";
import type { Deal } from "../../../domain/deal/deal";
import type { Activity, Lead } from "../../../domain/lead/lead";
import type { TemplateKey, TemplateOverride } from "../../../domain/message/template";
import type { Task } from "../../../domain/task/task";
import type { Collection, Database } from "../database";

const includesText = (values: string[], needle: string) => values.some((value) => value.toLowerCase().includes(needle.toLowerCase()));
const within = (iso: string, range?: { from: Date; to: Date }) => {
  if (!range) return true;
  const date = new Date(iso);
  return date >= range.from && date < range.to;
};

export class CollectionLeadRepository implements LeadRepository {
  private readonly leads: Collection<Lead>;
  private readonly activities: Collection<Activity>;
  constructor(db: Database) {
    this.leads = db.collection<Lead>("leads");
    this.activities = db.collection<Activity>("activities");
  }

  async list(scope: StaffScope, query: LeadQuery) {
    return (await this.leads.all())
      .filter((lead) => canAccess(scope, lead.agentId))
      .filter((lead) => !query.stage || lead.stage === query.stage)
      .filter((lead) => !query.agentId || lead.agentId === query.agentId)
      .filter((lead) => !query.q || includesText([lead.fullName, lead.phone, lead.email], query.q))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  findById(id: string) {
    return this.leads.get(id);
  }
  async create(lead: Lead) {
    await this.leads.put(lead);
    return lead;
  }
  async save(lead: Lead) {
    await this.leads.put(lead);
  }
  async listActivities(leadId: string) {
    return (await this.activities.all()).filter((activity) => activity.leadId === leadId);
  }
  async addActivity(activity: Activity) {
    await this.activities.put(activity);
  }
}

export class CollectionAppointmentRepository implements AppointmentRepository {
  private readonly appointments: Collection<Appointment>;
  constructor(db: Database) {
    this.appointments = db.collection<Appointment>("appointments");
  }
  async list(scope: StaffScope, range: { from: Date; to: Date }) {
    return (await this.appointments.all()).filter((item) => canAccess(scope, item.agentId) && within(item.startsAt, range));
  }
  async listForLead(leadId: string) {
    return (await this.appointments.all()).filter((item) => item.leadId === leadId);
  }
  findById(id: string) {
    return this.appointments.get(id);
  }
  async create(appointment: Appointment) {
    await this.appointments.put(appointment);
  }
  async save(appointment: Appointment) {
    await this.appointments.put(appointment);
  }
}

export class CollectionDealRepository implements DealRepository {
  private readonly deals: Collection<Deal>;
  constructor(db: Database) {
    this.deals = db.collection<Deal>("deals");
  }
  async list(scope: StaffScope, range?: { from: Date; to: Date }) {
    return (await this.deals.all()).filter((deal) => canAccess(scope, deal.agentId) && within(deal.closedAt, range));
  }
  async create(deal: Deal) {
    await this.deals.put(deal);
  }
}

export class CollectionTaskRepository implements TaskRepository {
  private readonly tasks: Collection<Task>;
  constructor(db: Database) {
    this.tasks = db.collection<Task>("tasks");
  }
  async list(scope: StaffScope, query: TaskQuery) {
    return (await this.tasks.all()).filter(
      (task) => canAccess(scope, task.agentId) && (query.leadId === undefined || task.leadId === query.leadId) && (query.includeDone || task.doneAt === null),
    );
  }
  findById(id: string) {
    return this.tasks.get(id);
  }
  async create(task: Task) {
    await this.tasks.put(task);
    return task;
  }
  async save(task: Task) {
    await this.tasks.put(task);
  }
}

export class CollectionTemplateRepository implements TemplateRepository {
  private readonly templates: Collection<TemplateOverride>;
  constructor(db: Database) {
    this.templates = db.collection<TemplateOverride>("templates");
  }
  list() {
    return this.templates.all();
  }
  async save(override: TemplateOverride) {
    await this.templates.put(override);
  }
  async remove(key: TemplateKey) {
    await this.templates.remove(key);
  }
}

export class CollectionReminderRepository implements ReminderRepository {
  private readonly reminders: Collection<ReminderRecord>;
  constructor(db: Database) {
    this.reminders = db.collection<ReminderRecord>("reminders");
  }
  async has(id: string) {
    return (await this.reminders.get(id)) !== null;
  }
  async add(record: ReminderRecord) {
    await this.reminders.put(record);
  }
}

export class CollectionNotificationRepository implements NotificationRepository {
  private readonly notifications: Collection<CrmNotification>;
  constructor(db: Database) {
    this.notifications = db.collection<CrmNotification>("notifications");
  }
  async listFor(userId: string) {
    return (await this.notifications.all()).filter((notification) => notification.userId === userId);
  }
  async add(notification: CrmNotification) {
    await this.notifications.put(notification);
  }
  async markAllRead(userId: string) {
    const unread = (await this.listFor(userId)).filter((notification) => !notification.read);
    await Promise.all(unread.map((notification) => this.notifications.put({ ...notification, read: true })));
  }
  /** Single-notification variant used by PATCH /crm/notifications/:id/read. Returns false when it is not the user's. */
  async markRead(userId: string, id: string): Promise<boolean> {
    const found = await this.notifications.get(id);
    if (!found || found.userId !== userId) return false;
    await this.notifications.put({ ...found, read: true });
    return true;
  }
}
