import type { StaffRole } from "../auth/session";

export interface Agent {
  readonly id: string;
  readonly agencyId: string;
  readonly role: StaffRole;
  readonly fullName: string;
  readonly firstName: string;
  readonly jobTitle: string;
  readonly avatarUrl: string;
  readonly phone: string;
  readonly whatsapp: string;
  readonly email: string;
  readonly defaultCommissionRate: number;
}

/** The only agent fields safe to show on the public site. */
export type PublicAgent = Pick<Agent, "id" | "fullName" | "jobTitle" | "avatarUrl" | "phone" | "whatsapp">;

export function toPublicAgent(agent: Agent): PublicAgent {
  const { id, fullName, jobTitle, avatarUrl, phone, whatsapp } = agent;
  return { id, fullName, jobTitle, avatarUrl, phone, whatsapp };
}

export function initialsOf(fullName: string): string {
  return fullName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}
