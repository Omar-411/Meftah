export type AppointmentStatus = "scheduled" | "done" | "cancelled";

export const APPOINTMENT_STATUS_LABELS: Record<AppointmentStatus, string> = {
  scheduled: "Planifiée",
  done: "Effectuée",
  cancelled: "Annulée",
};

export interface Appointment {
  readonly id: string;
  readonly agencyId: string;
  readonly agentId: string;
  readonly leadId: string;
  readonly listingId: string;
  readonly startsAt: string;
  readonly durationMin: number;
  readonly status: AppointmentStatus;
  readonly notes: string;
  readonly reminderMinutesBefore: number;
}

export const REMINDER_OPTIONS: ReadonlyArray<{ value: number; label: string }> = [
  { value: 0, label: "Aucun rappel" },
  { value: 30, label: "30 minutes avant" },
  { value: 60, label: "1 heure avant" },
  { value: 1440, label: "La veille" },
];

export function endsAt(appointment: Pick<Appointment, "startsAt" | "durationMin">): Date {
  return new Date(new Date(appointment.startsAt).getTime() + appointment.durationMin * 60_000);
}

export function overlaps(a: Pick<Appointment, "startsAt" | "durationMin">, b: Pick<Appointment, "startsAt" | "durationMin">): boolean {
  return new Date(a.startsAt) < endsAt(b) && new Date(b.startsAt) < endsAt(a);
}
