import { cookies } from "next/headers";

const FLASH_COOKIE = "darcrm_flash";

/** One-shot message for the next page, for actions that end in a redirect. Read and cleared by the Toaster in the browser. */
export async function setFlash(kind: "success" | "error" | "info", message: string): Promise<void> {
  (await cookies()).set(FLASH_COOKIE, JSON.stringify({ kind, message }), {
    path: "/",
    maxAge: 60,
    sameSite: "lax",
    httpOnly: false,
  });
}
