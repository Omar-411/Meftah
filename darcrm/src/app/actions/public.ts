"use server";

import { revalidatePath } from "next/cache";
import { createInquiry } from "@/application/public/create-inquiry";
import {
  deleteSavedSearch,
  saveSearch,
  setFavorite,
  updateSavedSearchAlerts,
} from "@/application/account/account";
import { parseSearchParams } from "@/domain/listing/filters";
import { getDeps } from "@/infrastructure/container";
import { readSession } from "@/infrastructure/session";
import { ok } from "@/domain/shared/result";
import { stateFromResult, text, type FormState } from "@/lib/form-state";
import { run } from "./run";

export async function submitInquiryAction(slug: string, _previous: FormState, data: FormData): Promise<FormState> {
  const result = await run(() =>
    createInquiry(
      getDeps(),
      slug,
      { fullName: text(data, "fullName"), phone: text(data, "phone"), email: text(data, "email"), message: text(data, "message") },
    ),
  );
  if (result.ok) revalidatePath("/crm", "layout");
  return stateFromResult(result, "Merci ! Votre demande est envoyée, l'agent vous rappelle rapidement.");
}

export async function toggleFavoriteAction(listingId: string, favorite: boolean): Promise<FormState> {
  const result = await run(async () => {
    await setFavorite(getDeps(), await readSession(), listingId, favorite);
    return ok(true);
  });
  if (result.ok) revalidatePath("/compte");
  return stateFromResult(result, favorite ? "Ajouté à vos favoris." : "Retiré de vos favoris.");
}

/** The search page's current URL query is passed in, so a saved search is exactly what the visitor sees. */
export async function saveSearchAction(queryString: string, _previous: FormState, data: FormData): Promise<FormState> {
  const { filters } = parseSearchParams(Object.fromEntries(new URLSearchParams(queryString)));
  const result = await run(async () =>
    saveSearch(
      getDeps(),
      await readSession(),
      { filters, whatsappAlerts: data.get("whatsappAlerts") === "on", whatsappPhone: text(data, "whatsappPhone") },
      new Date(),
    ),
  );
  if (result.ok) revalidatePath("/compte");
  return stateFromResult(result, "Recherche enregistrée. Retrouvez-la dans votre compte.");
}

export async function updateAlertAction(searchId: string, _previous: FormState, data: FormData): Promise<FormState> {
  const result = await run(async () =>
    updateSavedSearchAlerts(getDeps(), await readSession(), searchId, data.get("whatsappAlerts") === "on", text(data, "whatsappPhone")),
  );
  if (result.ok) revalidatePath("/compte");
  return stateFromResult(result, "Alertes mises à jour.");
}

export async function deleteSearchAction(searchId: string): Promise<FormState> {
  const result = await run(async () => {
    await deleteSavedSearch(getDeps(), await readSession(), searchId);
    return ok(true);
  });
  if (result.ok) revalidatePath("/compte");
  return stateFromResult(result, "Recherche supprimée.");
}
