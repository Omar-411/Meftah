import { notFound, redirect } from "next/navigation";
import { ForbiddenError, NotFoundError } from "@/application/errors";
import { isStaff, type StaffSession } from "@/domain/auth/session";
import { ApiError } from "@/infrastructure/http/client";
import { readSession } from "@/infrastructure/session";

export async function requireStaffPage(returnTo = "/crm"): Promise<StaffSession> {
  const session = await readSession();
  if (!isStaff(session)) redirect(`/connexion?next=${encodeURIComponent(returnTo)}`);
  return session;
}

export async function requireAdminPage(): Promise<StaffSession> {
  const session = await requireStaffPage();
  if (session.role !== "admin") redirect("/crm");
  return session;
}

/** Maps use-case errors to the right page behaviour so pages stay free of try/catch noise. */
export async function loadOrRedirect<T>(load: () => Promise<T>): Promise<T> {
  try {
    return await load();
  } catch (error) {
    if (error instanceof NotFoundError) notFound();
    if (error instanceof ForbiddenError) redirect("/crm");
    // Expired or rejected token: sign in again.
    if (error instanceof ApiError && error.status === 401) redirect("/session-expiree");
    throw error;
  }
}
