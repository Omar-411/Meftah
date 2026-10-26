import type { Agent } from "../../domain/agent/agent";
import type { Credential } from "../persistence/repositories/auth";
import { newId } from "../../domain/shared/id";
import type { Database } from "../persistence/database";
import { INITIAL_REF } from "../persistence/repositories/catalog";
import type { CollectionAuthGateway } from "../persistence/repositories/auth";
import { createSeed } from "./seed";

const REF_COUNTER = "listingRef";

async function putAll<T extends { readonly id: string }>(db: Database, name: Parameters<Database["collection"]>[0], documents: readonly T[]) {
  const collection = db.collection<T>(name);
  for (const document of documents) await collection.put(document);
}

export interface BootstrapOptions {
  readonly demoData: boolean;
  readonly admin?: { email: string; password: string; fullName: string };
}

/** Populates an empty database. Does nothing when an agency already exists, so restarts never overwrite data. */
export async function bootstrapDatabase(db: Database, auth: CollectionAuthGateway, options: BootstrapOptions, now = new Date()): Promise<"skipped" | "demo" | "admin-only"> {
  if ((await db.collection("agency").all()).length > 0) return "skipped";

  if (options.demoData) {
    const seed = createSeed(now);
    await putAll(db, "agency", [seed.agency]);
    await putAll(db, "agents", seed.agents);
    await putAll(db, "users", seed.users);
    for (const credential of seed.credentials) {
      if (credential.session.role === "user") continue;
      await auth.createStaffCredential({ id: credential.session.userId, email: credential.email, password: credential.password, role: credential.session.role, displayName: credential.session.displayName });
    }
    for (const credential of seed.credentials.filter((entry) => entry.session.role === "user")) {
      await auth.createUserCredential({ id: credential.session.userId, email: credential.email, password: credential.password, displayName: credential.session.displayName });
    }
    await putAll(db, "listings", seed.listings);
    await putAll(db, "leads", seed.leads);
    await putAll(db, "activities", seed.activities);
    await putAll(db, "appointments", seed.appointments);
    await putAll(db, "deals", seed.deals);
    await putAll(db, "tasks", seed.tasks);
    await putAll(db, "savedSearches", seed.savedSearches);
    await putAll(db, "alerts", seed.alerts);
    await putAll(db, "notifications", seed.notifications);
    const favorites = [...seed.favorites].flatMap(([userId, listingIds]) => [...listingIds].map((listingId) => ({ id: `${userId}:${listingId}`, userId, listingId })));
    await putAll(db, "favorites", favorites);
    await db.ensureCounter(REF_COUNTER, seed.refCounter);
    return "demo";
  }

  if (!options.admin) throw new Error("Base vide : activez SEED_DEMO_DATA ou définissez ADMIN_EMAIL et ADMIN_PASSWORD.");
  const agencyId = newId("agency");
  const agent: Agent = {
    id: newId("agent"), agencyId, role: "admin", fullName: options.admin.fullName, firstName: options.admin.fullName.split(" ")[0] ?? options.admin.fullName,
    jobTitle: "Administrateur", avatarUrl: "", phone: "", whatsapp: "", email: options.admin.email, defaultCommissionRate: 3,
  };
  await putAll(db, "agency", [{ id: agencyId, name: "Mon agence", tagline: "", phone: "", whatsapp: "", email: options.admin.email, address: "", heroImageUrl: "", whatsappAlertsEnabled: false, visitRemindersEnabled: false }]);
  await putAll(db, "agents", [agent]);
  await auth.createStaffCredential({ id: agent.id, email: options.admin.email, password: options.admin.password, role: "admin", displayName: agent.fullName });
  await db.ensureCounter(REF_COUNTER, INITIAL_REF);
  return "admin-only";
}

export interface AdminAccount {
  readonly email: string;
  readonly password: string;
  readonly fullName: string;
}

/**
 * Makes sure the configured admin can sign in, on any database (demo, empty or already in use).
 * An existing account with that e-mail is never touched, so a password changed in the app survives restarts.
 */
export async function ensureAdmin(db: Database, auth: CollectionAuthGateway, admin: AdminAccount): Promise<"created" | "exists"> {
  const email = admin.email.trim().toLowerCase();
  const credentials = await db.collection<Credential>("credentials").all();
  if (credentials.some((credential) => credential.email === email)) return "exists";

  const [agency] = await db.collection<{ id: string }>("agency").all();
  if (!agency) throw new Error("Aucune agence : la base doit être initialisée avant de créer l'administrateur.");

  const fullName = admin.fullName.trim();
  const agent: Agent = {
    id: newId("agent"), agencyId: agency.id, role: "admin", fullName, firstName: fullName.split(" ")[0] ?? fullName,
    jobTitle: "Administrateur", avatarUrl: "", phone: "", whatsapp: "", email, defaultCommissionRate: 3,
  };
  await db.collection<Agent>("agents").put(agent);
  await auth.createStaffCredential({ id: agent.id, email, password: admin.password, role: "admin", displayName: fullName });
  return "created";
}
