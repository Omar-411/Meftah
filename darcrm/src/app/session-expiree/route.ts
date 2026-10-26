import { NextResponse } from "next/server";
import { setFlash } from "@/infrastructure/flash";
import { clearSession } from "@/infrastructure/session";

/** Landing point when the backend rejects the token: clear the cookie (not possible during render), then sign in again. */
export async function GET(request: Request) {
  await clearSession();
  await setFlash("error", "Votre session a expiré. Reconnectez-vous.");
  return NextResponse.redirect(new URL("/connexion", request.url));
}
