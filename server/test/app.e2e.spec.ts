import type { NestExpressApplication } from "@nestjs/platform-express";
import { Test } from "@nestjs/testing";
import request from "supertest";

process.env.JWT_SECRET = "test-secret-test-secret-123";
process.env.DB_DRIVER = "memory";
process.env.REMINDERS_ENABLED = "false";
process.env.SEED_DEMO_DATA = "true";
process.env.ADMIN_EMAIL = "Owner@Example.tn";
process.env.ADMIN_PASSWORD = "proprietaire-secret";
process.env.ADMIN_NAME = "Omar Owner";

import { AppModule } from "../src/app.module";
import { configureApp } from "../src/configure-app";
import { dispatchDueReminders, dueReminders } from "../src/application/crm/reminders";
import type { Deps } from "../src/application/ports";
import { ALERT_GATEWAY, DEPS } from "../src/interface/tokens";

const sent: Array<{ to: string; text: string }> = [];

let app: NestExpressApplication;
const api = () => request(app.getHttpServer());

// Login is rate limited (20/min), so each demo account logs in once per run.
const tokens = new Map<string, string>();
async function tokenFor(email: string): Promise<string> {
  const cached = tokens.get(email);
  if (cached) return cached;
  const response = await api().post("/api/auth/login").send({ email, password: "demo1234" }).expect(200);
  const token = `Bearer ${response.body.token as string}`;
  tokens.set(email, token);
  return token;
}

beforeAll(async () => {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(ALERT_GATEWAY)
    .useValue({ sendWhatsapp: async (message: { to: string; text: string }) => void sent.push(message) })
    .compile();
  app = moduleRef.createNestApplication<NestExpressApplication>();
  configureApp(app, { corsOrigins: ["http://localhost:3000"] });
  await app.init();
  await app.listen(0);
});

afterAll(async () => {
  await app.close();
});

describe("auth", () => {
  it("rejects wrong credentials with 401", async () => {
    await api().post("/api/auth/login").send({ email: "sami@darcrm.tn", password: "nope" }).expect(401);
  });

  it("logs in and resolves the session", async () => {
    const auth = await tokenFor("sami@darcrm.tn");
    const me = await api().get("/api/auth/me").set("Authorization", auth).expect(200);
    expect(me.body).toMatchObject({ id: "agent_sami", role: "agent" });
  });

  it("registers a visitor and refuses a duplicate e-mail", async () => {
    const body = { fullName: "Nour Test", email: "nour@example.tn", phone: "98 123 456", password: "motdepasse1" };
    const created = await api().post("/api/auth/register").send(body).expect(201);
    expect(created.body.user.role).toBe("user");
    const duplicate = await api().post("/api/auth/register").send(body).expect(422);
    expect(duplicate.body.fields.email).toBeDefined();
  });

  it("rejects a tampered token", async () => {
    await api().get("/api/auth/me").set("Authorization", "Bearer abc.def.ghi").expect(401);
  });
});

describe("public API", () => {
  it("never exposes internal listing data", async () => {
    const page = await api().get("/api/public/listings?pageSize=48").expect(200);
    expect(page.body.items.length).toBeGreaterThan(0);
    for (const item of page.body.items) {
      expect(item).not.toHaveProperty("internal");
      expect(item).not.toHaveProperty("visibility");
      expect(item).not.toHaveProperty("status");
      expect(JSON.stringify(item)).not.toMatch(/Farhat|commission|mandate|Clés/i);
    }
  });

  it("only lists published, available listings", async () => {
    const staff = await tokenFor("admin@darcrm.tn");
    const all = await api().get("/api/crm/listings").set("Authorization", staff).expect(200);
    const hidden = all.body.filter((listing: { visibility: string; status: string }) => listing.visibility !== "published" || listing.status !== "available");
    const page = await api().get("/api/public/listings?pageSize=48").expect(200);
    const publicIds = new Set(page.body.items.map((item: { id: string }) => item.id));
    expect(hidden.length).toBeGreaterThan(0);
    for (const listing of hidden) expect(publicIds.has(listing.id)).toBe(false);
  });

  it("applies English filter names and falls back on bad values", async () => {
    const sale = await api().get("/api/public/listings?transaction=sale&priceMin=oops&sort=nonsense").expect(200);
    expect(sale.body.items.every((item: { transaction: string }) => item.transaction === "sale")).toBe(true);
  });

  it("returns 404 for unknown slugs and only public agent fields", async () => {
    await api().get("/api/public/listings/inexistant").expect(404);
    const agent = await api().get("/api/agents/agent_sami").expect(200);
    expect(agent.body).not.toHaveProperty("email");
    expect(agent.body).not.toHaveProperty("defaultCommissionRate");
    const staff = await api().get("/api/agents/agent_sami").set("Authorization", await tokenFor("admin@darcrm.tn")).expect(200);
    expect(staff.body).toHaveProperty("defaultCommissionRate");
  });

  it("validates inquiries with field errors", async () => {
    const response = await api().post("/api/public/listings/x/inquiries").send({ fullName: "A", phone: "1", message: "x" }).expect(422);
    expect(response.body.fields).toMatchObject({ fullName: expect.any(String), phone: expect.any(String) });
  });

  it("turns an inquiry into a lead for the listing's agent, with a notification", async () => {
    const featured = await api().get("/api/public/listings/featured?limit=1").expect(200);
    const listing = featured.body[0] as { slug: string; agentId: string; id: string };
    const created = await api()
      .post(`/api/public/listings/${listing.slug}/inquiries`)
      .send({ fullName: "Visiteur Test", phone: "98 765 432", email: "", message: "Je souhaite visiter ce bien." })
      .expect(201);

    const owner = await tokenFor(listing.agentId === "agent_sami" ? "sami@darcrm.tn" : "leila@darcrm.tn");
    const lead = await api().get(`/api/crm/leads/${created.body.leadId}`).set("Authorization", owner).expect(200);
    expect(lead.body).toMatchObject({ stage: "new", listingId: listing.id, agentId: listing.agentId });
    const notifications = await api().get("/api/crm/notifications").set("Authorization", owner).expect(200);
    expect(notifications.body.some((n: { href: string }) => n.href.endsWith(created.body.leadId))).toBe(true);
  });
});

describe("role scoping", () => {
  it("requires a session for the CRM (401) and the right role (403)", async () => {
    await api().get("/api/crm/leads").expect(401);
    await api().get("/api/crm/leads").set("Authorization", await tokenFor("user@darcrm.tn")).expect(403);
    await api().get("/api/crm/settings/agency").set("Authorization", await tokenFor("sami@darcrm.tn")).expect(403);
  });

  it("limits an agent to their own leads and listings, and forbids reading a colleague's", async () => {
    const sami = await tokenFor("sami@darcrm.tn");
    const leads = await api().get("/api/crm/leads").set("Authorization", sami).expect(200);
    expect(leads.body.every((lead: { agentId: string }) => lead.agentId === "agent_sami")).toBe(true);
    // lead_7 belongs to Leila
    await api().get("/api/crm/leads/lead_7").set("Authorization", sami).expect(403);
    // asking for someone else's data through the query string must not widen the scope
    const spoofed = await api().get("/api/crm/leads?agentId=agent_leila").set("Authorization", sami).expect(200);
    expect(spoofed.body).toEqual([]);
    await api().get("/api/crm/listings/lst_4").set("Authorization", sami).expect(403);
  });

  it("lets the admin see everything", async () => {
    const admin = await tokenFor("admin@darcrm.tn");
    const leads = await api().get("/api/crm/leads").set("Authorization", admin).expect(200);
    expect(new Set(leads.body.map((lead: { agentId: string }) => lead.agentId)).size).toBeGreaterThan(1);
  });

  it("only lets an admin reassign a lead", async () => {
    const sami = await tokenFor("sami@darcrm.tn");
    const lead = (await api().get("/api/crm/leads/lead_3").set("Authorization", sami).expect(200)).body;
    await api().put("/api/crm/leads/lead_3").set("Authorization", sami).send({ ...lead, agentId: "agent_leila" }).expect(403);

    const admin = await tokenFor("admin@darcrm.tn");
    await api().put("/api/crm/leads/lead_3").set("Authorization", admin).send({ ...lead, agentId: "agent_leila" }).expect(200);
    const leila = await tokenFor("leila@darcrm.tn");
    const notifications = await api().get("/api/crm/notifications").set("Authorization", leila).expect(200);
    expect(notifications.body.some((n: { kind: string }) => n.kind === "lead_assigned")).toBe(true);
  });
});

describe("listings and alerts", () => {
  const draft = (overrides: Record<string, unknown> = {}) => ({
    agentId: "agent_sami",
    transaction: "sale",
    propertyType: "apartment",
    status: "available",
    visibility: "draft",
    title: "Appartement e2e à La Marsa",
    description: "Un appartement de test suffisamment décrit pour passer la validation.",
    price: 410_000,
    cityId: "la-marsa",
    district: "Corniche",
    builtArea: 120,
    rooms: 3,
    photos: [{ id: "ph_1", fileName: "salon.jpg", url: "https://example.com/salon.jpg", alt: "Salon" }],
    internal: { ownerName: "Propriétaire Secret", ownerPhone: "98 000 000", commissionRate: 3 },
    ...overrides,
  });

  it("assigns ref and slug on the server and keeps drafts private", async () => {
    const sami = await tokenFor("sami@darcrm.tn");
    const created = await api().post("/api/crm/listings").set("Authorization", sami).send({ ...draft(), id: "hacked", ref: "REF-1" }).expect(201);
    expect(created.body.id).not.toBe("hacked");
    expect(created.body.ref).toMatch(/^REF-\d+$/);
    expect(created.body.slug).toContain(created.body.ref.toLowerCase());
    await api().get(`/api/public/listings/${created.body.slug}`).expect(404);
  });

  it("publishing sends a WhatsApp alert to matching saved searches and records it", async () => {
    sent.length = 0;
    const sami = await tokenFor("sami@darcrm.tn");
    const created = await api().post("/api/crm/listings").set("Authorization", sami).send(draft({ title: "Alerte e2e appartement La Marsa" })).expect(201);
    await api().post(`/api/crm/listings/${created.body.id}/publish`).set("Authorization", sami).expect(200);

    expect(sent.length).toBeGreaterThanOrEqual(1);
    expect(sent[0]?.text).toContain("Alerte e2e");
    const visitor = await tokenFor("user@darcrm.tn");
    const alerts = await api().get("/api/me/alerts").set("Authorization", visitor).expect(200);
    expect(alerts.body.some((alert: { listingId: string }) => alert.listingId === created.body.id)).toBe(true);
    await api().get(`/api/public/listings/${created.body.slug}`).expect(200);
  });

  it("refuses to update a colleague's listing", async () => {
    const sami = await tokenFor("sami@darcrm.tn");
    await api().put("/api/crm/listings/lst_4").set("Authorization", sami).send(draft()).expect(403);
    await api().put("/api/crm/listings/does-not-exist").set("Authorization", sami).send(draft()).expect(404);
  });

  it("returns 400 with fields on a malformed body", async () => {
    const sami = await tokenFor("sami@darcrm.tn");
    const response = await api().post("/api/crm/listings").set("Authorization", sami).send({ title: "x" }).expect(400);
    expect(response.body.fields).toBeDefined();
  });
});

describe("favorites and saved searches", () => {
  it("scopes favorites to the token's user", async () => {
    const visitor = await tokenFor("user@darcrm.tn");
    await api().put("/api/me/favorites/lst_2").set("Authorization", visitor).expect(204);
    const ids = await api().get("/api/me/favorites").set("Authorization", visitor).expect(200);
    expect(ids.body).toContain("lst_2");
    await api().delete("/api/me/favorites/lst_2").set("Authorization", visitor).expect(204);
    await api().get("/api/me/favorites").expect(401);
  });

  it("does not let a client-chosen id overwrite another user's saved search", async () => {
    const other = (await api().post("/api/auth/register").send({ fullName: "Autre Visiteur", email: "autre@example.tn", phone: "97 111 222", password: "motdepasse1" }).expect(201)).body.token as string;
    const response = await api().put("/api/me/saved-searches/srch_1").set("Authorization", `Bearer ${other}`).send({ filters: { transaction: "rent" }, whatsappAlerts: false, whatsappPhone: "" });
    expect(response.status).toBe(403);
  });
});

describe("deals", () => {
  it("records a sale, closes the listing and removes it from the public site", async () => {
    const sami = await tokenFor("sami@darcrm.tn");
    const before = await api().get("/api/public/listings/s-2-lumineux-a-ennasr-ii-proche-commodites-ref-1007");
    expect(before.status).toBe(200);

    const deal = await api().post("/api/crm/deals").set("Authorization", sami).send({ leadId: "lead_5", listingId: "lst_12", amount: 590_000, commissionRate: 3 }).expect(201);
    expect(deal.body).toMatchObject({ agentId: "agent_sami", leadId: "lead_5" });
    const listing = await api().get("/api/crm/listings/lst_12").set("Authorization", sami).expect(200);
    expect(listing.body.status).toBe("closed");
    await api().post("/api/crm/deals").set("Authorization", sami).send({ leadId: "lead_5", listingId: "lst_12", amount: 1, commissionRate: 3 }).expect(422);
  });

  it("refuses to close a lead as 'closed' without a recorded sale", async () => {
    const sami = await tokenFor("sami@darcrm.tn");
    const lead = (await api().get("/api/crm/leads/lead_4").set("Authorization", sami).expect(200)).body;
    await api().put("/api/crm/leads/lead_4").set("Authorization", sami).send({ ...lead, stage: "closed" }).expect(422);
  });
});

describe("profile", () => {
  it("lets an agent update their agent record and keeps e-mail read-only", async () => {
    const leila = await tokenFor("leila@darcrm.tn");
    const updated = await api()
      .put("/api/me/profile")
      .set("Authorization", leila)
      .send({ fullName: "Leila M. Mansour", phone: "22 314 891", whatsapp: "+216 22 314 891", jobTitle: "Conseillère senior", email: "hacker@evil.tn" })
      .expect(200);
    expect(updated.body).toMatchObject({ fullName: "Leila M. Mansour", jobTitle: "Conseillère senior", email: "leila@darcrm.tn" });
    const agent = await api().get("/api/agents/agent_leila").set("Authorization", leila).expect(200);
    expect(agent.body.firstName).toBe("Leila");
  });

  it("validates profile fields", async () => {
    const visitor = await tokenFor("user@darcrm.tn");
    const response = await api().put("/api/me/profile").set("Authorization", visitor).send({ fullName: "A", phone: "1" }).expect(422);
    expect(response.body.fields).toMatchObject({ fullName: expect.any(String), phone: expect.any(String) });
    await api().put("/api/me/profile").send({ fullName: "Aaa", phone: "98 123 456" }).expect(401);
  });

  it("changes the password only with the right current one, then the old one stops working", async () => {
    const body = { fullName: "Pwd Test", email: "pwd@example.tn", phone: "98 123 456", password: "ancienmotdepasse" };
    const token = `Bearer ${(await api().post("/api/auth/register").send(body).expect(201)).body.token as string}`;
    const wrong = await api().post("/api/me/password").set("Authorization", token).send({ currentPassword: "faux", newPassword: "nouveaumotdepasse" }).expect(422);
    expect(wrong.body.fields.currentPassword).toBeDefined();
    await api().post("/api/me/password").set("Authorization", token).send({ currentPassword: body.password, newPassword: "court" }).expect(422);
    await api().post("/api/me/password").set("Authorization", token).send({ currentPassword: body.password, newPassword: "nouveaumotdepasse" }).expect(204);
    await api().post("/api/auth/login").send({ email: body.email, password: body.password }).expect(401);
    await api().post("/api/auth/login").send({ email: body.email, password: "nouveaumotdepasse" }).expect(200);
  });
});

describe("configured admin account", () => {
  it("can sign in (e-mail is case-insensitive), has admin rights and sees the whole agency", async () => {
    const login = await api().post("/api/auth/login").send({ email: "owner@example.tn", password: "proprietaire-secret" }).expect(200);
    expect(login.body.user).toMatchObject({ role: "admin", fullName: "Omar Owner" });
    const auth = `Bearer ${login.body.token as string}`;
    await api().get("/api/crm/settings/agency").set("Authorization", auth).expect(200);
    const leads = await api().get("/api/crm/leads").set("Authorization", auth).expect(200);
    expect(leads.body.length).toBeGreaterThan(5);
  });
});

describe("request size", () => {
  it("accepts a listing carrying photos of a few MB and answers 413 with a clear message above the limit", async () => {
    const sami = await tokenFor("sami@darcrm.tn");
    const photo = (bytes: number) => ({ id: "p", fileName: "a.jpg", url: `data:image/jpeg;base64,${"A".repeat(bytes)}`, alt: "" });
    const body = (bytes: number) => ({
      agentId: "agent_sami", transaction: "sale", propertyType: "apartment", status: "available", visibility: "draft", title: "Photos lourdes",
      price: 1000, cityId: "la-marsa", district: "X", builtArea: 50, rooms: 2, internal: {}, photos: [photo(bytes)],
    });
    await api().post("/api/crm/listings").set("Authorization", sami).send(body(3_000_000)).expect(201);
    const tooBig = await api().post("/api/crm/listings").set("Authorization", sami).send(body(13_000_000)).expect(413);
    expect(tooBig.body.message).toMatch(/photos/i);
  });
});

describe("users management", () => {
  const admin = () => tokenFor("admin@darcrm.tn");
  const staff = { fullName: "Rim Agent", email: "Rim@Example.tn", phone: "97 111 222", role: "agent", jobTitle: "", password: "motdepasse1" };

  it("is reserved to admins", async () => {
    await api().get("/api/crm/users").expect(401);
    await api().get("/api/crm/users").set("Authorization", await tokenFor("sami@darcrm.tn")).expect(403);
    await api().post("/api/crm/users").set("Authorization", await tokenFor("user@darcrm.tn")).send(staff).expect(403);
  });

  it("lists every account with its role and status", async () => {
    const list = await api().get("/api/crm/users").set("Authorization", await admin()).expect(200);
    const roles = new Set(list.body.map((account: { role: string }) => account.role));
    expect(roles).toEqual(new Set(["admin", "agent", "user"]));
  });

  it("creates an agent who can sign in and refuses duplicates and weak input", async () => {
    const auth = await admin();
    const created = await api().post("/api/crm/users").set("Authorization", auth).send(staff).expect(201);
    expect(created.body).toMatchObject({ role: "agent", email: "rim@example.tn", active: true });
    await api().post("/api/crm/users").set("Authorization", auth).send(staff).expect(422);
    const weak = await api().post("/api/crm/users").set("Authorization", auth).send({ ...staff, email: "x@example.tn", password: "123" }).expect(422);
    expect(weak.body.fields.password).toBeDefined();
    const login = await api().post("/api/auth/login").send({ email: "rim@example.tn", password: "motdepasse1" }).expect(200);
    expect(login.body.user.role).toBe("agent");
    const agents = await api().get("/api/agents").expect(200);
    expect(JSON.stringify(agents.body)).toContain("Rim Agent");
  });

  it("applies a deactivation at once, even to a token issued before, then allows reactivation", async () => {
    const auth = await admin();
    const login = await api().post("/api/auth/login").send({ email: "rim@example.tn", password: "motdepasse1" }).expect(200);
    const rim = `Bearer ${login.body.token as string}`;
    const id = login.body.user.id as string;
    await api().patch(`/api/crm/users/${id}/active`).set("Authorization", auth).send({ active: false }).expect(200);
    await api().get("/api/crm/leads").set("Authorization", rim).expect(401);
    await api().post("/api/auth/login").send({ email: "rim@example.tn", password: "motdepasse1" }).expect(401);
    await api().patch(`/api/crm/users/${id}/active`).set("Authorization", auth).send({ active: true }).expect(200);
    await api().get("/api/crm/leads").set("Authorization", rim).expect(200);
  });

  it("applies a role change at once and protects the last admin and oneself", async () => {
    const auth = await admin();
    const login = await api().post("/api/auth/login").send({ email: "rim@example.tn", password: "motdepasse1" }).expect(200);
    const rim = `Bearer ${login.body.token as string}`;
    const id = login.body.user.id as string;
    await api().get("/api/crm/settings/agency").set("Authorization", rim).expect(403);
    await api().patch(`/api/crm/users/${id}/role`).set("Authorization", auth).send({ role: "admin" }).expect(200);
    await api().get("/api/crm/settings/agency").set("Authorization", rim).expect(200);
    await api().patch(`/api/crm/users/${id}/role`).set("Authorization", auth).send({ role: "agent" }).expect(200);

    const me = await api().get("/api/auth/me").set("Authorization", auth).expect(200);
    const self = await api().patch(`/api/crm/users/${me.body.id as string}/active`).set("Authorization", auth).send({ active: false }).expect(422);
    expect(self.body.message).toMatch(/propre compte/);
    await api().patch(`/api/crm/users/${me.body.id as string}/role`).set("Authorization", auth).send({ role: "agent" }).expect(422);
  });

  it("refuses to promote a visitor", async () => {
    const list = await api().get("/api/crm/users").set("Authorization", await admin()).expect(200);
    const visitor = list.body.find((account: { role: string }) => account.role === "user");
    await api().patch(`/api/crm/users/${visitor.id}/role`).set("Authorization", await admin()).send({ role: "agent" }).expect(422);
  });
});

describe("tasks", () => {
  const key = (offset: number) => {
    const date = new Date();
    date.setDate(date.getDate() + offset);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  };

  it("requires a staff session", async () => {
    await api().get("/api/crm/tasks").expect(401);
    await api().get("/api/crm/tasks").set("Authorization", await tokenFor("user@darcrm.tn")).expect(403);
  });

  it("scopes tasks: an agent sees only their own open tasks, an admin sees all", async () => {
    const sami = await api().get("/api/crm/tasks").set("Authorization", await tokenFor("sami@darcrm.tn")).expect(200);
    expect(sami.body.length).toBeGreaterThan(0);
    expect(new Set(sami.body.map((task: { agentId: string }) => task.agentId))).toEqual(new Set(["agent_sami"]));
    expect(sami.body.every((task: { doneAt: string | null }) => task.doneAt === null)).toBe(true);
    const all = await api().get("/api/crm/tasks").set("Authorization", await tokenFor("admin@darcrm.tn")).expect(200);
    expect(all.body.length).toBeGreaterThan(sami.body.length);
  });

  it("creates a task on a lead for the lead's agent, validates input and refuses another agent's lead", async () => {
    const sami = await tokenFor("sami@darcrm.tn");
    const created = await api().post("/api/crm/tasks").set("Authorization", sami).send({ leadId: "lead_1", title: "  Rappeler demain ", dueDate: key(1) }).expect(201);
    expect(created.body).toMatchObject({ agentId: "agent_sami", leadId: "lead_1", title: "Rappeler demain", doneAt: null });
    const bad = await api().post("/api/crm/tasks").set("Authorization", sami).send({ leadId: null, title: "x", dueDate: "demain" }).expect(422);
    expect(Object.keys(bad.body.fields)).toEqual(expect.arrayContaining(["title", "dueDate"]));
    await api().post("/api/crm/tasks").set("Authorization", sami).send({ leadId: "lead_7", title: "Pas à moi", dueDate: key(1) }).expect(403);
    const forLead = await api().get("/api/crm/tasks?leadId=lead_1").set("Authorization", sami).expect(200);
    expect(forLead.body.some((task: { id: string }) => task.id === created.body.id)).toBe(true);
  });

  it("an admin creating a task on an agent's lead assigns it to that agent", async () => {
    const created = await api().post("/api/crm/tasks").set("Authorization", await tokenFor("admin@darcrm.tn")).send({ leadId: "lead_7", title: "Suivi admin", dueDate: key(0) }).expect(201);
    expect(created.body.agentId).toBe("agent_leila");
  });

  it("completes and reopens a task, and hides other agents' tasks", async () => {
    const sami = await tokenFor("sami@darcrm.tn");
    const created = await api().post("/api/crm/tasks").set("Authorization", sami).send({ leadId: null, title: "Tâche à terminer", dueDate: key(0) }).expect(201);
    const done = await api().patch(`/api/crm/tasks/${created.body.id as string}`).set("Authorization", sami).send({ done: true }).expect(200);
    expect(done.body.doneAt).not.toBeNull();
    const open = await api().get("/api/crm/tasks").set("Authorization", sami).expect(200);
    expect(open.body.some((task: { id: string }) => task.id === created.body.id)).toBe(false);
    const withDone = await api().get("/api/crm/tasks?includeDone=true").set("Authorization", sami).expect(200);
    expect(withDone.body.some((task: { id: string }) => task.id === created.body.id)).toBe(true);
    await api().patch(`/api/crm/tasks/${created.body.id as string}`).set("Authorization", sami).send({ done: false }).expect(200);
    await api().patch(`/api/crm/tasks/${created.body.id as string}`).set("Authorization", await tokenFor("leila@darcrm.tn")).send({ done: true }).expect(403);
    await api().patch("/api/crm/tasks/task_missing").set("Authorization", sami).send({ done: true }).expect(404);
  });
});

describe("message templates", () => {
  it("lists only customised templates and restricts editing to admins", async () => {
    const sami = await tokenFor("sami@darcrm.tn");
    const admin = await tokenFor("admin@darcrm.tn");
    await api().get("/api/crm/templates").expect(401);
    await api().get("/api/crm/templates").set("Authorization", sami).expect(200);
    await api().put("/api/crm/templates/post_visit").set("Authorization", sami).send({ body: "Bonjour {prenom}, merci pour votre visite." }).expect(403);

    const unknown = await api().put("/api/crm/templates/post_visit").set("Authorization", admin).send({ body: "Bonjour {prenom}, voici {prix} de moins." }).expect(422);
    expect(unknown.body.message).toMatch(/\{prix\}/);
    await api().put("/api/crm/templates/post_visit").set("Authorization", admin).send({ body: "court" }).expect(422);
    await api().put("/api/crm/templates/inconnu").set("Authorization", admin).send({ body: "Bonjour {prenom}, merci pour votre visite." }).expect(404);

    const saved = await api().put("/api/crm/templates/post_visit").set("Authorization", admin).send({ body: "Bonjour {prenom}, merci pour votre visite de {bien} !" }).expect(200);
    expect(saved.body).toMatchObject({ key: "post_visit", customized: true });
    const overrides = await api().get("/api/crm/templates").set("Authorization", sami).expect(200);
    expect(overrides.body).toEqual([expect.objectContaining({ key: "post_visit" })]);
    await api().delete("/api/crm/templates/post_visit").set("Authorization", admin).expect(204);
    expect((await api().get("/api/crm/templates").set("Authorization", sami).expect(200)).body).toEqual([]);
  });
});

describe("visit reminders", () => {
  const at = (now: Date, minutesAhead: number) => new Date(now.getTime() + minutesAhead * 60_000);

  it("decides which reminder is due from the time left", () => {
    const now = new Date("2026-10-25T08:00:00Z");
    const visit = (minutes: number, status: "scheduled" | "done" = "scheduled") => ({ startsAt: at(now, minutes).toISOString(), status });
    expect(dueReminders(visit(23 * 60), now)).toEqual(["day"]);
    expect(dueReminders(visit(90), now)).toEqual([]);
    expect(dueReminders(visit(45), now)).toEqual(["hour"]);
    expect(dueReminders(visit(3 * 24 * 60), now)).toEqual([]);
    expect(dueReminders(visit(-5), now)).toEqual([]);
    expect(dueReminders(visit(45, "done"), now)).toEqual([]);
  });

  it("sends each reminder once with the agency's text, logs it on the lead, and respects the agency switch", async () => {
    const deps = app.get<Deps>(DEPS);
    const sami = await tokenFor("sami@darcrm.tn");
    const admin = await tokenFor("admin@darcrm.tn");
    const lead = (await api().post("/api/crm/leads").set("Authorization", sami).send({ fullName: "Zélie Rappel", phone: "98 765 432" })).body as { id: string };
    const now = new Date();
    const startsAt = at(now, 40).toISOString();
    const visit = (id: string, leadId: string, listingId: string, startsAt: string) =>
      deps.appointments.create({ id, agencyId: "agency_1", agentId: "agent_sami", leadId, listingId, startsAt, durationMin: 30, status: "scheduled", notes: "", reminderMinutesBefore: 0 });
    await visit("apt_rem_1", lead.id, "lst_1", startsAt);
    await api().put("/api/crm/templates/visit_reminder_hour").set("Authorization", admin).send({ body: "Salut {prenom}, visite de {bien} à {heure} !" }).expect(200);

    const before = sent.length;
    const first = await dispatchDueReminders(deps, now);
    expect(first.sent).toBeGreaterThanOrEqual(1);
    const mine = sent.slice(before).filter((message) => message.text.includes("Zélie"));
    expect(mine).toHaveLength(1);
    expect(mine[0]?.to).toBe("98 765 432");
    expect(mine[0]?.text).toMatch(/^Salut Zélie, visite de .+ à \d{2}h\d{2} !$/);

    await dispatchDueReminders(deps, now);
    expect(sent.slice(before).filter((message) => message.text.includes("Zélie"))).toHaveLength(1);
    const activities = await api().get(`/api/crm/leads/${lead.id}/activities`).set("Authorization", sami).expect(200);
    expect(activities.body.filter((activity: { summary: string }) => /Rappel WhatsApp/.test(activity.summary))).toHaveLength(1);
    await api().delete("/api/crm/templates/visit_reminder_hour").set("Authorization", admin).expect(204);

    const agency = (await api().get("/api/crm/settings/agency").set("Authorization", admin).expect(200)).body;
    await api().put("/api/crm/settings/agency").set("Authorization", admin).send({ ...agency, visitRemindersEnabled: false }).expect(200);
    const second = (await api().post("/api/crm/leads").set("Authorization", sami).send({ fullName: "Yasmine Silence", phone: "97 111 222" })).body as { id: string };
    await visit("apt_rem_2", second.id, "lst_2", at(now, 20).toISOString());
    const count = sent.length;
    expect((await dispatchDueReminders(deps, now)).sent).toBe(0);
    expect(sent.length).toBe(count);
    await api().put("/api/crm/settings/agency").set("Authorization", admin).send({ ...agency, visitRemindersEnabled: true }).expect(200);
  });
});
