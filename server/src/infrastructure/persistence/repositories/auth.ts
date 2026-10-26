import type { AccountDirectory, AuthGateway } from "../../../application/ports";
import type { ManagedAccount, NewStaffAccount, StaffAccountRole } from "../../../domain/account/managed-account";
import type { Agent } from "../../../domain/agent/agent";
import type { PublicUser } from "../../../domain/account/account";
import type { Role, Session } from "../../../domain/auth/session";
import { newId } from "../../../domain/shared/id";
import { fail, ok, type Result } from "../../../domain/shared/result";
import { hashPassword, verifyPassword } from "../../security/password";
import type { Collection, Database } from "../database";

/** `id` is the owning user's id (agent or visitor), so there is at most one credential per user. */
export interface Credential {
  readonly id: string;
  readonly email: string;
  readonly passwordHash: string;
  readonly role: Role;
  readonly displayName: string;
  /** Missing means active, so credentials created before this field existed keep working. */
  readonly active?: boolean;
}

export class CollectionAuthGateway implements AuthGateway {
  private readonly credentials: Collection<Credential>;
  private readonly users: Collection<PublicUser>;
  constructor(db: Database) {
    this.credentials = db.collection<Credential>("credentials");
    this.users = db.collection<PublicUser>("users");
  }

  private async findByEmail(email: string) {
    return (await this.credentials.all()).find((credential) => credential.email === email) ?? null;
  }

  async login(email: string, password: string): Promise<Session | null> {
    const credential = await this.findByEmail(email);
    // Hash even when the account is unknown so the response time does not reveal which e-mails exist.
    const valid = await verifyPassword(password, credential?.passwordHash ?? DUMMY_HASH);
    if (!credential || !valid || credential.active === false) return null;
    return { userId: credential.id, role: credential.role, displayName: credential.displayName };
  }

  async sessionOf(userId: string): Promise<Session | null> {
    const credential = await this.credentials.get(userId);
    if (!credential || credential.active === false) return null;
    return { userId: credential.id, role: credential.role, displayName: credential.displayName };
  }

  async registerUser(input: { fullName: string; email: string; phone: string; password: string }): Promise<Result<Session>> {
    if (await this.findByEmail(input.email)) return fail("Un compte existe déjà avec cet e-mail.", { email: "E-mail déjà utilisé." });

    const id = newId("user");
    const displayName = input.fullName.trim();
    await this.users.put({ id, fullName: displayName, email: input.email, phone: input.phone });
    await this.credentials.put({ id, email: input.email, passwordHash: await hashPassword(input.password), role: "user", displayName });
    return ok({ userId: id, role: "user", displayName });
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<Result<true>> {
    const credential = await this.credentials.get(userId);
    const valid = await verifyPassword(currentPassword, credential?.passwordHash ?? DUMMY_HASH);
    if (!credential || !valid) return fail("Mot de passe actuel incorrect.", { currentPassword: "Mot de passe actuel incorrect." });
    await this.credentials.put({ ...credential, passwordHash: await hashPassword(newPassword) });
    return ok(true);
  }

  async rename(userId: string, displayName: string): Promise<void> {
    const credential = await this.credentials.get(userId);
    if (credential) await this.credentials.put({ ...credential, displayName });
  }

  /** Seed only: the matching `users` document is inserted separately. */
  async createUserCredential(credential: { id: string; email: string; password: string; displayName: string }) {
    await this.credentials.put({ id: credential.id, email: credential.email, passwordHash: await hashPassword(credential.password), role: "user", displayName: credential.displayName });
  }

  /** Used by the seed and the admin bootstrap. */
  async createStaffCredential(credential: { id: string; email: string; password: string; role: Exclude<Role, "user">; displayName: string }) {
    await this.credentials.put({
      id: credential.id,
      email: credential.email,
      passwordHash: await hashPassword(credential.password),
      role: credential.role,
      displayName: credential.displayName,
    });
  }
}

export class CollectionAccountDirectory implements AccountDirectory {
  private readonly credentials: Collection<Credential>;
  private readonly users: Collection<PublicUser>;
  private readonly agents: Collection<Agent>;
  private readonly agencies: Collection<{ readonly id: string }>;
  constructor(db: Database) {
    this.credentials = db.collection<Credential>("credentials");
    this.users = db.collection<PublicUser>("users");
    this.agents = db.collection<Agent>("agents");
    this.agencies = db.collection<{ readonly id: string }>("agency");
  }

  async list(): Promise<ManagedAccount[]> {
    const [credentials, users, agents] = await Promise.all([this.credentials.all(), this.users.all(), this.agents.all()]);
    const phoneOf = new Map<string, string>([...users, ...agents].map((profile) => [profile.id, profile.phone]));
    return credentials.map((credential) => ({
      id: credential.id,
      fullName: credential.displayName,
      email: credential.email,
      phone: phoneOf.get(credential.id) ?? "",
      role: credential.role,
      active: credential.active !== false,
    }));
  }

  async find(id: string): Promise<ManagedAccount | null> {
    return (await this.list()).find((account) => account.id === id) ?? null;
  }

  async createStaff(input: NewStaffAccount): Promise<Result<ManagedAccount>> {
    const taken = (await this.credentials.all()).some((credential) => credential.email === input.email);
    if (taken) return fail("Un compte existe déjà avec cet e-mail.", { email: "E-mail déjà utilisé." });

    const agencyId = (await this.agencies.all())[0]?.id ?? "";
    const id = newId("agent");
    const agent: Agent = {
      id, agencyId, role: input.role, fullName: input.fullName, firstName: input.fullName.split(" ")[0] ?? input.fullName,
      jobTitle: input.jobTitle, avatarUrl: "", phone: input.phone, whatsapp: input.phone, email: input.email, defaultCommissionRate: 3,
    };
    await this.agents.put(agent);
    await this.credentials.put({ id, email: input.email, passwordHash: await hashPassword(input.password), role: input.role, displayName: input.fullName });
    return ok({ id, fullName: input.fullName, email: input.email, phone: input.phone, role: input.role, active: true });
  }

  async setRole(id: string, role: StaffAccountRole): Promise<void> {
    const [credential, agent] = await Promise.all([this.credentials.get(id), this.agents.get(id)]);
    if (credential) await this.credentials.put({ ...credential, role });
    if (agent) await this.agents.put({ ...agent, role });
  }

  async setActive(id: string, active: boolean): Promise<void> {
    const credential = await this.credentials.get(id);
    if (credential) await this.credentials.put({ ...credential, active });
  }
}

const DUMMY_HASH = "scrypt:00000000000000000000000000000000:" + "00".repeat(64);
