import type { Metadata } from "next";
import Link from "next/link";
import { getTodayView, type TodayView } from "@/application/crm/today";
import { formatLongDateFr, formatRelativeFr, formatTimeFr, pluralize, telLink, whatsappLink } from "@/domain/shared/format";
import { SOURCE_ICONS, SOURCE_LABELS } from "@/domain/lead/lead";
import { getDeps } from "@/infrastructure/container";
import { PageHeader } from "@/components/crm/page-header";
import { TaskForm } from "@/components/crm/task-form";
import { TaskRow } from "@/components/crm/task-row";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Panel } from "@/components/ui/panel";
import { loadOrRedirect, requireStaffPage } from "../_lib/guard";

export const metadata: Metadata = { title: "Aujourd'hui" };

export default async function TodayPage() {
  const session = await requireStaffPage("/crm/aujourdhui");
  const now = new Date();
  const view = await loadOrRedirect(() => getTodayView(getDeps(), session, now));

  return (
    <>
      <PageHeader
        title={`Bonjour ${session.displayName.split(" ")[0]}`}
        subtitle={`${formatLongDateFr(now)} · ${view.pendingCount === 0 ? "rien en attente" : `${pluralize(view.pendingCount, "chose")} à traiter`}`}
      />

      <div className="grid gap-space-lg lg:grid-cols-[1.2fr_1fr]">
        <div className="min-w-0 space-y-space-lg">
          <Panel icon="add_task" title="Ajouter une tâche">
            <TaskForm todayKey={view.dayKey} leadOptions={view.leadOptions} />
          </Panel>

          {view.overdue.length > 0 && (
            <Panel icon="alarm" iconClassName="text-error" title={`En retard (${view.overdue.length})`}>
              <ul className="divide-y divide-outline-variant/40">
                {view.overdue.map(({ task, lead }) => (
                  <TaskRow key={task.id} task={task} todayKey={view.dayKey} lead={lead} />
                ))}
              </ul>
            </Panel>
          )}

          <Panel icon="today" title={`À faire aujourd'hui (${view.dueToday.length})`}>
            {view.dueToday.length === 0 ? (
              <p className="font-body-md text-body-md text-on-surface-variant">Aucune tâche prévue aujourd'hui. Ajoutez-en une ci-dessus ou traitez vos nouveaux prospects.</p>
            ) : (
              <ul className="divide-y divide-outline-variant/40">
                {view.dueToday.map(({ task, lead }) => (
                  <TaskRow key={task.id} task={task} todayKey={view.dayKey} lead={lead} />
                ))}
              </ul>
            )}
          </Panel>

          <Panel icon="event" title={`Visites du jour (${view.visits.length})`} trailing={<Link href="/crm/rendez-vous" className="font-label-md text-label-md text-primary hover:underline">Agenda</Link>}>
            {view.visits.length === 0 ? (
              <p className="font-body-md text-body-md text-on-surface-variant">Pas de visite aujourd'hui.</p>
            ) : (
              <ul className="space-y-space-sm">
                {view.visits.map(({ appointment, leadName, leadPhone, listing }) => (
                  <li key={appointment.id} className="flex flex-wrap items-center gap-space-md rounded-lg bg-surface-container-low p-space-sm">
                    <span className="w-14 shrink-0 font-label-md text-label-md font-semibold text-primary">{formatTimeFr(new Date(appointment.startsAt))}</span>
                    <span className="min-w-0 flex-1">
                      <Link href={`/crm/prospects/${appointment.leadId}`} className="block truncate font-label-md text-label-md font-semibold text-on-surface hover:underline">{leadName}</Link>
                      <span className="block truncate font-body-sm text-body-sm text-on-surface-variant">{listing ? `${listing.ref} · ${listing.title}` : "Bien supprimé"}</span>
                    </span>
                    {leadPhone && <ContactButtons phone={leadPhone} message={`Bonjour ${leadName.split(" ")[0]}, je confirme notre visite aujourd'hui à ${formatTimeFr(new Date(appointment.startsAt))}.`} />}
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        <div className="min-w-0 space-y-space-lg">
          <NewLeadsPanel view={view} />
          <CoolingPanel view={view} />
        </div>
      </div>
    </>
  );
}

/** "Attend depuis 2 heures", or "Vient d'arriver" while there is nothing meaningful to count. */
function waitingLabel(createdAt: string, now: Date): string {
  const relative = formatRelativeFr(new Date(createdAt), now);
  return relative.startsWith("il y a ") ? `Attend depuis ${relative.slice(7)}` : "Vient d'arriver";
}

function ContactButtons({ phone, message }: { phone: string; message: string }) {
  return (
    <span className="flex shrink-0 items-center gap-1">
      <a href={telLink(phone)} aria-label="Appeler" className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-container-lowest text-primary shadow-sm hover:bg-surface-container-high">
        <Icon name="call" className="text-[18px]" />
      </a>
      <a href={whatsappLink(phone, message)} target="_blank" rel="noreferrer" aria-label="Écrire sur WhatsApp" className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-container-lowest text-secondary shadow-sm hover:bg-surface-container-high">
        <Icon name="chat" className="text-[18px]" />
      </a>
    </span>
  );
}

function NewLeadsPanel({ view }: { view: TodayView }) {
  return (
    <Panel icon="mark_email_unread" title={`Nouveaux prospects à contacter (${view.newLeads.length})`}>
      {view.newLeads.length === 0 ? (
        <p className="font-body-md text-body-md text-on-surface-variant">Tous vos nouveaux prospects ont été contactés.</p>
      ) : (
        <ul className="space-y-space-sm">
          {view.newLeads.map(({ lead, listing }) => {
            const first = lead.fullName.split(" ")[0];
            const message = listing ? `Bonjour ${first}, je vous contacte au sujet de ${listing.title}.` : `Bonjour ${first}, je vous contacte de la part de l'agence.`;
            return (
              <li key={lead.id} className="rounded-lg bg-surface-container-low p-space-sm">
                <div className="flex items-start gap-space-sm">
                  <span className="min-w-0 flex-1">
                    <Link href={`/crm/prospects/${lead.id}`} className="block truncate font-label-md text-label-md font-semibold text-on-surface hover:underline">{lead.fullName}</Link>
                    <span className="block truncate font-body-sm text-body-sm text-on-surface-variant">{listing ? `${listing.ref} · ${listing.title}` : lead.message || "Demande générale"}</span>
                    <span className="mt-1 flex flex-wrap items-center gap-x-2 font-label-sm text-label-sm text-on-surface-variant">
                      <Icon name={SOURCE_ICONS[lead.source]} className="text-[14px]" />
                      {SOURCE_LABELS[lead.source]}
                      <Badge tone="warning">{waitingLabel(lead.createdAt, view.now)}</Badge>
                    </span>
                  </span>
                  {lead.phone && <ContactButtons phone={lead.phone} message={message} />}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}

function CoolingPanel({ view }: { view: TodayView }) {
  return (
    <Panel icon="mode_cool" title={`À relancer (${view.cooling.length})`}>
      {view.cooling.length === 0 ? (
        <p className="font-body-md text-body-md text-on-surface-variant">Aucun prospect ne refroidit. Beau travail.</p>
      ) : (
        <ul className="space-y-space-sm">
          {view.cooling.map(({ lead, daysSinceContact }) => (
            <li key={lead.id} className="flex items-center gap-space-sm rounded-lg bg-surface-container-low p-space-sm">
              <span className="min-w-0 flex-1">
                <Link href={`/crm/prospects/${lead.id}`} className="block truncate font-label-md text-label-md font-semibold text-on-surface hover:underline">{lead.fullName}</Link>
                <span className="block font-body-sm text-body-sm text-on-surface-variant">Sans contact depuis {pluralize(daysSinceContact, "jour")}</span>
              </span>
              {lead.phone && <ContactButtons phone={lead.phone} message={`Bonjour ${lead.fullName.split(" ")[0]}, je reviens vers vous pour faire le point sur votre recherche.`} />}
              <ButtonLink href={`/crm/prospects/${lead.id}`} size="sm" variant="secondary">Ouvrir</ButtonLink>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
