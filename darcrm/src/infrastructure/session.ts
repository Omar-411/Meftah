import { cookies } from "next/headers";
import type { Session } from "@/domain/auth/session";

const COOKIE_NAME = "darcrm_session";
const SEVEN_DAYS = 60 * 60 * 24 * 7;

function isSession(value: unknown): value is Session {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.userId === "string" &&
    typeof candidate.displayName === "string" &&
    (candidate.role === "admin" || candidate.role === "agent" || candidate.role === "user")
  );
}

/**
 * Session lives in an httpOnly cookie.
 * Mock mode: the cookie holds the identity directly (demo only, not tamper-proof).
 * HTTP mode: it also holds the backend's access token, and the backend remains the authority.
 */
export async function readSession(): Promise<Session | null> {
  const raw = (await cookies()).get(COOKIE_NAME)?.value;
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(decodeURIComponent(raw));
    if (!isSession(parsed)) return null;
    // A cookie left over from mock mode has no token: treat it as logged out so the user signs in again.
    if (process.env.API_MODE === "http" && !parsed.accessToken) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function writeSession(session: Session): Promise<void> {
  (await cookies()).set(COOKIE_NAME, encodeURIComponent(JSON.stringify(session)), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SEVEN_DAYS,
  });
}

export async function clearSession(): Promise<void> {
  (await cookies()).delete(COOKIE_NAME);
}
