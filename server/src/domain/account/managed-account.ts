import type { Role } from "../auth/session";

/** An account as the admin sees it in the users page, whatever its role. */
export interface ManagedAccount {
  readonly id: string;
  readonly fullName: string;
  readonly email: string;
  readonly phone: string;
  readonly role: Role;
  readonly active: boolean;
}

export type StaffAccountRole = Exclude<Role, "user">;

export interface NewStaffAccount {
  readonly fullName: string;
  readonly email: string;
  readonly phone: string;
  readonly role: StaffAccountRole;
  readonly jobTitle: string;
  readonly password: string;
}

export const MIN_PASSWORD_LENGTH = 8;
