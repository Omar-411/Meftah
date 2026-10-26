import { z } from "zod";

const str = z.string().trim();
const money = z.number().finite().nonnegative();

export const transaction = z.enum(["sale", "rent"]);
export const propertyType = z.enum(["apartment", "villa", "duplex", "penthouse", "land", "office"]);
const listingStatus = z.enum(["available", "reserved", "closed"]);
const visibility = z.enum(["draft", "published"]);
const leadStage = z.enum(["new", "contacted", "visit_scheduled", "negotiating", "closed", "lost"]);
const leadSource = z.enum(["website", "whatsapp", "phone", "referral", "portal", "manual"]);
const activityKind = z.enum(["call", "visit", "follow_up", "whatsapp", "email", "note", "stage_change", "system"]);

export const loginBody = z.object({ email: z.string().email(), password: z.string().min(1) });
export const registerBody = z.object({ fullName: z.string(), email: z.string(), phone: z.string(), password: z.string() });

export const inquiryBody = z.object({ fullName: z.string(), phone: z.string(), email: z.string().default(""), message: z.string() });

const filters = z.object({
  transaction: transaction.optional(),
  cityId: z.string().optional(),
  propertyType: propertyType.optional(),
  priceMin: z.number().optional(),
  priceMax: z.number().optional(),
  minRooms: z.number().optional(),
  minArea: z.number().optional(),
});
export const savedSearchBody = z.object({
  filters,
  whatsappAlerts: z.boolean().default(false),
  whatsappPhone: z.string().default(""),
  name: z.string().optional(),
});

export const listingBody = z.object({
  agentId: z.string().min(1),
  transaction,
  propertyType,
  status: listingStatus,
  visibility,
  title: z.string(),
  description: z.string().default(""),
  price: money,
  hidePrice: z.boolean().default(false),
  condoFees: money.default(0),
  titleDeed: z.string().default(""),
  cityId: z.string().min(1),
  district: z.string().default(""),
  address: z.string().default(""),
  hideExactAddress: z.boolean().default(true),
  builtArea: money,
  terraceArea: money.default(0),
  rooms: money,
  bedrooms: money.default(0),
  bathrooms: money.default(0),
  floorDescription: z.string().default(""),
  amenityIds: z.array(z.string()).default([]),
  photos: z.array(z.object({ id: z.string(), fileName: z.string(), url: z.string(), alt: z.string().default("") })).max(20).default([]),
  internal: z.object({
    ownerName: z.string().default(""),
    ownerPhone: z.string().default(""),
    notes: z.string().default(""),
    commissionRate: z.number().min(0).max(100).default(3),
    mandateType: z.enum(["exclusive", "simple"]).default("exclusive"),
    mandateNumber: z.string().default(""),
    mandateExpiry: z.string().default(""),
    keysLocation: z.string().default(""),
  }),
});

export const listingStateBody = z.object({ visibility: visibility.optional(), status: listingStatus.optional() });

const criteria = z.object({
  transaction,
  propertyTypes: z.array(propertyType).default([]),
  cityIds: z.array(z.string()).default([]),
  budgetMin: z.number().optional(),
  budgetMax: z.number().optional(),
  minRooms: z.number().optional(),
  minArea: z.number().optional(),
});

export const createLeadBody = z.object({
  fullName: z.string(),
  phone: z.string(),
  email: z.string().default(""),
  source: leadSource.default("manual"),
  message: z.string().default(""),
  listingId: z.string().nullable().default(null),
  criteria: criteria.default({ transaction: "sale", propertyTypes: [], cityIds: [] }),
});

export const saveLeadBody = z.object({
  fullName: z.string(),
  phone: z.string(),
  email: z.string().default(""),
  message: z.string().default(""),
  stage: leadStage,
  lostReason: z.string().nullable().default(null),
  listingId: z.string().nullable().default(null),
  criteria,
  lastContactAt: z.string().nullable().default(null),
  agentId: z.string().min(1),
});

export const activityBody = z.object({ kind: activityKind, summary: z.string() });

export const appointmentBody = z.object({
  leadId: z.string().min(1),
  listingId: z.string().min(1),
  startsAt: z.string(),
  durationMin: z.number().int().positive().max(600),
  notes: z.string().default(""),
  reminderMinutesBefore: z.number().int().nonnegative().default(60),
});
export const appointmentStatusBody = z.object({ status: z.enum(["scheduled", "done", "cancelled"]) });

export const dealBody = z.object({
  leadId: z.string().min(1),
  listingId: z.string().min(1),
  amount: z.number().positive(),
  commissionRate: z.number().min(0).max(100),
});

export const agencyBody = z.object({
  id: z.string(),
  name: z.string(),
  tagline: z.string().default(""),
  phone: z.string(),
  whatsapp: z.string(),
  email: z.string(),
  address: z.string().default(""),
  heroImageUrl: z.string().default(""),
  whatsappAlertsEnabled: z.boolean(),
  visitRemindersEnabled: z.boolean().default(false),
});

export const profileBody = z.object({
  fullName: z.string(),
  phone: z.string(),
  whatsapp: z.string().optional(),
  jobTitle: z.string().optional(),
});
export const passwordBody = z.object({ currentPassword: z.string(), newPassword: z.string() });

export const isoDate = z.string().datetime({ offset: true }).transform((value) => new Date(value));

export const staffAccountBody = z.object({
  fullName: z.string(),
  email: z.string(),
  phone: z.string(),
  role: z.enum(["agent", "admin"]),
  jobTitle: z.string().default(""),
  password: z.string(),
});
export const accountRoleBody = z.object({ role: z.enum(["agent", "admin"]) });
export const accountActiveBody = z.object({ active: z.boolean() });

export const taskBody = z.object({ leadId: z.string().min(1).nullable().default(null), title: z.string(), dueDate: z.string() });
export const taskDoneBody = z.object({ done: z.boolean() });

export const templateBody = z.object({ body: z.string() });
