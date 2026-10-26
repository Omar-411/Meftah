import { ActionForm } from "@/components/ui/action-form";
import type { Metadata } from "next";
import Link from "next/link";
import { getWeekAgenda } from "@/application/crm/appointments";
import { setAppointmentStatusAction } from "@/app/actions/crm";
import { addDays, formatTimeFr, formatWeekdayShortFr, isSameDay, parseDateKey, startOfWeek, startOfDay, toDateKey, telLink } from "@/domain/shared/format";
import { getDeps } from "@/infrastructure/container";
import { PageHeader } from "@/components/crm/page-header";
import { ScheduleForm } from "@/components/crm/schedule-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Panel } from "@/components/ui/panel";
import { cn } from "@/lib/cn";
import { loadOrRedirect, requireStaffPage } from "../_lib/guard";

export const metadata: Metadata = { title: "Rendez-vous" };

type SearchParams = Promise<{ semaine?: string; prospect?: string }>;

const weekRange = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long" });

export default async function AgendaPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await requireStaffPage("/crm/rendez-vous");
  const { semaine, prospect } = await searchParams;
  const now = new Date();
  const weekStart = startOfWeek(parseDateKey(semaine) ?? now);
  const agenda = await loadOrRedirect(() => getWeekAgenda(getDeps(), session, weekStart));

  const days = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
  const weekHref = (offset: number) => `/crm/rendez-vous?semaine=${toDateKey(addDays(weekStart, offset * 7))}`;
  const today = startOfDay(now);

  return (
    <>
      <PageHeader
        title="Rendez-vous"
        subtitle={`Semaine du ${weekRange.format(weekStart)} au ${weekRange.format(addDays(weekStart, 6))}`}
        actions={
          <div className="inline-flex items-center gap-1 rounded-lg bg-surface-container-low p-1">
            <Link href={weekHref(-1)} aria-label="Semaine précédente" className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-surface-container-lowest">
              <Icon name="chevron_left" className="text-[20px]" />
            </Link>
            <Link href="/crm/rendez-vous" className="px-space-sm font-label-md text-label-md text-on-surface">Aujourd'hui</Link>
            <Link href={weekHref(1)} aria-label="Semaine suivante" className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-surface-container-lowest">
              <Icon name="chevron_right" className="text-[20px]" />
            </Link>
          </div>
        }
      />

      <div className="grid gap-space-sm md:grid-cols-7">
        {days.map((day) => {
          const items = agenda.items.filter((item) => isSameDay(new Date(item.appointment.startsAt), day));
          const isToday = isSameDay(day, today);
          return (
            <section key={toDateKey(day)} aria-label={toDateKey(day)} className={cn("min-h-24 rounded-xl p-space-sm", isToday ? "bg-primary-fixed/40 ring-2 ring-primary-container/40" : "bg-surface-container-low")}>
              <h2 className="mb-space-sm flex items-baseline justify-between px-1 font-label-md text-label-md font-semibold text-on-surface">
                {formatWeekdayShortFr(day)}
                <span className="font-label-sm text-label-sm text-on-surface-variant">{day.getDate()}</span>
              </h2>
              <ul className="space-y-space-sm">
                {items.map(({ appointment, leadName, leadPhone, listing, agentName }) => (
                  <li key={appointment.id} className={cn("rounded-lg bg-surface-container-lowest p-space-sm shadow-sm", appointment.status === "cancelled" && "opacity-60")}>
                    <p className="font-label-md text-label-md font-semibold text-primary">{formatTimeFr(new Date(appointment.startsAt))}</p>
                    <p className="font-label-md text-label-md font-semibold text-on-surface">{leadName}</p>
                    <p className="truncate font-label-sm text-label-sm text-on-surface-variant">{listing ? listing.title : "Bien supprimé"}</p>
                    {session.role === "admin" && <p className="font-label-sm text-label-sm text-outline">{agentName}</p>}
                    {appointment.status === "scheduled" ? (
                      <div className="mt-1.5 flex items-center gap-1">
                        {leadPhone && (
                          <a href={telLink(leadPhone)} aria-label={`Appeler ${leadName}`} className="flex h-7 w-7 items-center justify-center rounded-full bg-surface-container-low text-primary">
                            <Icon name="call" className="text-[16px]" />
                          </a>
                        )}
                        <ActionForm action={setAppointmentStatusAction.bind(null, appointment.id, "done")}>
                          <Button type="submit" size="sm" variant="ghost" aria-label="Marquer comme effectuée"><Icon name="check_circle" className="text-[18px]" /></Button>
                        </ActionForm>
                        <ActionForm action={setAppointmentStatusAction.bind(null, appointment.id, "cancelled")}>
                          <Button type="submit" size="sm" variant="ghost" aria-label="Annuler le rendez-vous"><Icon name="cancel" className="text-[18px]" /></Button>
                        </ActionForm>
                      </div>
                    ) : (
                      <Badge tone={appointment.status === "done" ? "success" : "neutral"} className="mt-1.5">{appointment.status === "done" ? "Effectuée" : "Annulée"}</Badge>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>

      <div className="mt-space-lg max-w-3xl">
        <Panel icon="event_available" title="Planifier une visite">
          <ScheduleForm
            leadOptions={agenda.leadOptions}
            listingOptions={agenda.listingOptions}
            defaultLeadId={prospect ?? ""}
            defaultDate={toDateKey(now)}
          />
        </Panel>
      </div>
    </>
  );
}
