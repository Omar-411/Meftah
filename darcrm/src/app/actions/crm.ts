"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAgencySettings, markNotificationsRead, saveAgencySettings } from "@/application/crm/admin";
import { scheduleAppointment, setAppointmentStatus } from "@/application/crm/appointments";
import { createLead, logActivity, moveLeadStage, reassignLead, updateLeadCriteria } from "@/application/crm/leads";
import { deleteListing, saveListing, setListingState } from "@/application/crm/listings";
import type { AgencySettings } from "@/domain/agency/agency";
import type { AppointmentStatus } from "@/domain/appointment/appointment";
import type { ListingStatus, Visibility } from "@/domain/listing/catalog";
import type { Listing } from "@/domain/listing/listing";
import type { ActivityKind, LeadSource, LeadStage, SearchCriteria } from "@/domain/lead/lead";
import { EMPTY_CRITERIA, STAGE_LABELS } from "@/domain/lead/lead";
import { ok } from "@/domain/shared/result";
import { getDeps } from "@/infrastructure/container";
import { setFlash } from "@/infrastructure/flash";
import { readSession } from "@/infrastructure/session";
import { optionalNumber, stateFromResult, text, type FormState } from "@/lib/form-state";
import { run } from "./run";

/** CRM data feeds the public site too (CRM is the source of truth), so any change refreshes everything. */
const refreshEverything = () => revalidatePath("/", "layout");

export async function saveListingAction(_previous: FormState, data: FormData): Promise<FormState> {
  let draft: Listing;
  try {
    draft = JSON.parse(text(data, "payload")) as Listing;
  } catch {
    return { status: "error", message: "Le formulaire est invalide, rechargez la page." };
  }
  const result = await run(async () => saveListing(getDeps(), await readSession(), draft, new Date()));
  if (!result.ok) return stateFromResult(result, "");
  refreshEverything();
  if (!draft.id) {
    await setFlash("success", result.value.visibility === "published" ? "Annonce créée et visible sur le site." : "Brouillon créé.");
    redirect(`/crm/biens/${result.value.ref}/modifier?cree=1`);
  }
  return stateFromResult(result, result.value.visibility === "published" ? "Annonce enregistrée et visible sur le site." : "Brouillon enregistré.");
}

export async function setListingStateAction(id: string, change: { visibility?: Visibility; status?: ListingStatus }): Promise<FormState> {
  const result = await run(async () => setListingState(getDeps(), await readSession(), id, change, new Date()));
  if (result.ok) refreshEverything();
  const message = change.visibility === "published" ? "Annonce publiée : elle est visible sur le site." : change.visibility === "draft" ? "Annonce repassée en brouillon." : "Statut de l'annonce mis à jour.";
  return stateFromResult(result, message);
}

export async function deleteListingAction(id: string): Promise<void> {
  const result = await run(async () => {
    await deleteListing(getDeps(), await readSession(), id);
    return ok(true);
  });
  if (result.ok) refreshEverything();
  await setFlash(result.ok ? "success" : "error", result.ok ? "Annonce supprimée." : result.error);
  redirect("/crm/biens");
}

export async function createLeadAction(_previous: FormState, data: FormData): Promise<FormState> {
  const listingId = text(data, "listingId");
  const criteria: SearchCriteria = {
    ...EMPTY_CRITERIA,
    transaction: text(data, "transaction") === "rent" ? "rent" : "sale",
    budgetMax: optionalNumber(data, "budgetMax"),
  };
  const result = await run(async () =>
    createLead(
      getDeps(),
      await readSession(),
      {
        fullName: text(data, "fullName"),
        phone: text(data, "phone"),
        email: text(data, "email"),
        source: text(data, "source") as LeadSource,
        message: text(data, "message"),
        listingId: listingId || null,
        criteria,
      },
      new Date(),
    ),
  );
  if (!result.ok) return stateFromResult(result, "");
  refreshEverything();
  await setFlash("success", "Prospect créé.");
  redirect(`/crm/prospects/${result.value.id}`);
}

export async function moveLeadStageAction(leadId: string, stage: LeadStage, _previous: FormState, data: FormData): Promise<FormState> {
  const result = await run(async () =>
    moveLeadStage(
      getDeps(),
      await readSession(),
      leadId,
      stage,
      {
        lostReason: text(data, "lostReason"),
        deal:
          stage === "closed"
            ? { listingId: text(data, "listingId"), amount: optionalNumber(data, "amount") ?? 0, commissionRate: optionalNumber(data, "commissionRate") ?? 0 }
            : undefined,
      },
      new Date(),
    ),
  );
  if (result.ok) refreshEverything();
  return stateFromResult(result, "Étape mise à jour.");
}

/** Used by the kanban's quick stage selector, which only offers stages that need no extra details. */
export async function quickMoveLeadAction(leadId: string, data: FormData): Promise<FormState> {
  const stage = text(data, "stage") as LeadStage;
  const result = await run(async () => moveLeadStage(getDeps(), await readSession(), leadId, stage, {}, new Date()));
  if (result.ok) refreshEverything();
  return stateFromResult(result, `Prospect déplacé : ${STAGE_LABELS[stage] ?? "étape mise à jour"}.`);
}

export async function logActivityAction(leadId: string, _previous: FormState, data: FormData): Promise<FormState> {
  const result = await run(async () => logActivity(getDeps(), await readSession(), leadId, text(data, "kind") as ActivityKind, text(data, "summary"), new Date()));
  if (result.ok) refreshEverything();
  return stateFromResult(result, "Échange enregistré.");
}

export async function reassignLeadAction(leadId: string, data: FormData): Promise<FormState> {
  const result = await run(async () => reassignLead(getDeps(), await readSession(), leadId, text(data, "agentId"), new Date()));
  if (result.ok) refreshEverything();
  return stateFromResult(result, "Prospect réassigné. L'agent a été prévenu.");
}

export async function updateCriteriaAction(leadId: string, _previous: FormState, data: FormData): Promise<FormState> {
  const criteria: SearchCriteria = {
    transaction: text(data, "transaction") === "rent" ? "rent" : "sale",
    propertyTypes: data.getAll("propertyTypes").filter((value): value is string => typeof value === "string") as SearchCriteria["propertyTypes"],
    cityIds: data.getAll("cityIds").filter((value): value is string => typeof value === "string"),
    budgetMin: optionalNumber(data, "budgetMin"),
    budgetMax: optionalNumber(data, "budgetMax"),
    minRooms: optionalNumber(data, "minRooms"),
    minArea: optionalNumber(data, "minArea"),
  };
  const result = await run(async () => updateLeadCriteria(getDeps(), await readSession(), leadId, criteria, new Date()));
  if (result.ok) refreshEverything();
  return stateFromResult(result, "Critères enregistrés.");
}

export async function scheduleAppointmentAction(_previous: FormState, data: FormData): Promise<FormState> {
  const startsAt = new Date(`${text(data, "date")}T${text(data, "time")}:00`);
  const result = await run(async () =>
    scheduleAppointment(
      getDeps(),
      await readSession(),
      {
        leadId: text(data, "leadId"),
        listingId: text(data, "listingId"),
        startsAt: Number.isNaN(startsAt.getTime()) ? "" : startsAt.toISOString(),
        durationMin: optionalNumber(data, "durationMin") ?? 45,
        notes: text(data, "notes"),
        reminderMinutesBefore: optionalNumber(data, "reminder") ?? 0,
      },
      new Date(),
    ),
  );
  if (result.ok) refreshEverything();
  return stateFromResult(result, "Rendez-vous planifié.");
}

export async function setAppointmentStatusAction(id: string, status: AppointmentStatus): Promise<FormState> {
  const result = await run(async () => {
    await setAppointmentStatus(getDeps(), await readSession(), id, status, new Date());
    return ok(true);
  });
  if (result.ok) refreshEverything();
  return stateFromResult(result, status === "done" ? "Visite effectuée. Une relance est prévue demain dans vos tâches." : "Rendez-vous annulé.");
}

export async function saveSettingsAction(_previous: FormState, data: FormData): Promise<FormState> {
  const current = await run(async () => ok(await getAgencySettings(getDeps(), await readSession())));
  if (!current.ok) return stateFromResult(current, "");

  const next: AgencySettings = {
    ...current.value,
    name: text(data, "name"),
    tagline: text(data, "tagline"),
    phone: text(data, "phone"),
    whatsapp: text(data, "whatsapp"),
    email: text(data, "email"),
    address: text(data, "address"),
    whatsappAlertsEnabled: data.get("whatsappAlertsEnabled") === "on",
    visitRemindersEnabled: data.get("visitRemindersEnabled") === "on",
  };
  const result = await run(async () => saveAgencySettings(getDeps(), await readSession(), next));
  if (result.ok) refreshEverything();
  return stateFromResult(result, "Paramètres enregistrés.");
}

export async function markNotificationsReadAction(): Promise<void> {
  await run(async () => {
    await markNotificationsRead(getDeps(), await readSession());
    return ok(true);
  });
  revalidatePath("/crm", "layout");
}
