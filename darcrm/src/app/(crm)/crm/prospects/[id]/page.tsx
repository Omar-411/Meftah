import { ActionForm } from "@/components/ui/action-form";
import type { Metadata } from "next";
import Link from "next/link";
import { getLeadDetail } from "@/application/crm/leads";
import { listTasks } from "@/application/crm/tasks";
import { composeMessages } from "@/application/crm/templates";
import { listCrmListings } from "@/application/crm/listings";
import { reassignLeadAction, quickMoveLeadAction } from "@/app/actions/crm";
import { APPOINTMENT_STATUS_LABELS } from "@/domain/appointment/appointment";
import { commissionOf } from "@/domain/deal/deal";
import { SOURCE_ICONS, SOURCE_LABELS } from "@/domain/lead/lead";
import { toDateKey, formatAmount, formatLongDateFr, formatTimeFr, telLink, whatsappLink } from "@/domain/shared/format";
import { getDeps } from "@/infrastructure/container";
import { StageBadge } from "@/components/crm/badges";
import { WhatsappComposer } from "@/components/crm/whatsapp-composer";
import { TaskForm } from "@/components/crm/task-form";
import { TaskRow } from "@/components/crm/task-row";
import { LeadActivity } from "@/components/crm/lead-activity";
import { LeadCriteriaForm } from "@/components/crm/lead-criteria-form";
import { LeadStageActions } from "@/components/crm/lead-stage-actions";
import { ListingThumb } from "@/components/crm/listing-thumb";
import { PageHeader } from "@/components/crm/page-header";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { SelectInput } from "@/components/ui/form";
import { Icon } from "@/components/ui/icon";
import { Panel } from "@/components/ui/panel";
import { loadOrRedirect, requireStaffPage } from "../../_lib/guard";

export const metadata: Metadata = { title: "Prospect" };

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireStaffPage(`/crm/prospects/${id}`);
  const deps = getDeps();
  const now = new Date();

  const [detail, ownListings, tasks, composed] = await loadOrRedirect(() =>
    Promise.all([getLeadDetail(deps, session, id), listCrmListings(deps, session, {}), listTasks(deps, session, { leadId: id, includeDone: true }), composeMessages(deps, session, id, now)]),
  );
  const todayKey = toDateKey(now);
  const orderedTasks = [...tasks].sort((a, b) => Number(a.doneAt !== null) - Number(b.doneAt !== null) || a.dueDate.localeCompare(b.dueDate));
  const { lead, agent, agents, listing, activities, appointments, matches, deal } = detail;

  const dealOptions = ownListings.filter((candidate) => candidate.status !== "closed").map((candidate) => ({ id: candidate.id, label: `${candidate.ref} · ${candidate.title}`, price: candidate.price }));
  const interest = listing ? `Bonjour ${lead.fullName.split(" ")[0]}, je vous contacte au sujet de ${listing.title}.` : `Bonjour ${lead.fullName.split(" ")[0]}, je vous contacte de la part de l'agence.`;

  return (
    <>
      <PageHeader
        title={lead.fullName}
        subtitle={`${SOURCE_LABELS[lead.source]} · reçu le ${formatLongDateFr(new Date(lead.createdAt))}`}
        actions={<StageBadge stage={lead.stage} />}
      />

      <div className="grid gap-space-lg lg:grid-cols-[1fr_360px]">
        <div className="min-w-0 space-y-space-lg">
          <Panel icon="swap_horiz" title="Avancement">
            {lead.stage === "closed" && deal && (
              <div className="flex flex-wrap items-center gap-space-md">
                <Badge tone="success">Conclu</Badge>
                <span className="font-body-md text-body-md text-on-surface">
                  {formatAmount(deal.amount)} TND · commission {formatAmount(commissionOf(deal))} TND ({deal.commissionRate}%)
                </span>
              </div>
            )}
            {lead.stage === "lost" && <p className="font-body-md text-body-md text-on-surface-variant">Perdu : {lead.lostReason ?? "motif non renseigné"}</p>}
            {(lead.stage === "closed" || lead.stage === "lost") && (
              <ActionForm action={quickMoveLeadAction.bind(null, lead.id)} className="mt-space-sm">
                <input type="hidden" name="stage" value="contacted" />
                <Button type="submit" size="sm" variant="secondary">
                  <Icon name="undo" className="text-[18px]" />
                  Rouvrir le prospect
                </Button>
              </ActionForm>
            )}
            <LeadStageActions
              leadId={lead.id}
              stage={lead.stage}
              listingOptions={dealOptions}
              defaultListingId={lead.listingId}
              defaultCommissionRate={agent.defaultCommissionRate}
            />
          </Panel>

          {lead.message && (
            <Panel icon="format_quote" title="Message reçu">
              <p className="whitespace-pre-line font-body-md text-body-md text-on-surface-variant">{lead.message}</p>
            </Panel>
          )}

          {lead.phone && (
            <Panel icon="chat" iconClassName="text-secondary" title="Messages WhatsApp">
              <WhatsappComposer leadId={lead.id} phone={lead.phone} messages={composed.messages} />
            </Panel>
          )}

          <Panel icon="task_alt" title="Tâches">
            {orderedTasks.length > 0 && (
              <ul className="mb-space-md divide-y divide-outline-variant/40">
                {orderedTasks.map((task) => (
                  <TaskRow key={task.id} task={task} todayKey={todayKey} showDate />
                ))}
              </ul>
            )}
            <TaskForm todayKey={todayKey} leadId={lead.id} />
          </Panel>

          <Panel icon="history" title="Journal des échanges">
            <LeadActivity leadId={lead.id} activities={activities} nowIso={now.toISOString()} />
          </Panel>

          <Panel icon="event" title="Visites" trailing={<ButtonLink href={`/crm/rendez-vous?prospect=${lead.id}`} size="sm" variant="secondary">Planifier</ButtonLink>}>
            {appointments.length === 0 ? (
              <p className="font-body-md text-body-md text-on-surface-variant">Aucune visite planifiée.</p>
            ) : (
              <ul className="space-y-space-sm">
                {appointments.map(({ appointment, listing: visited }) => (
                  <li key={appointment.id} className="flex flex-wrap items-center justify-between gap-space-sm">
                    <span>
                      <span className="block font-label-md text-label-md font-semibold text-on-surface">
                        {formatLongDateFr(new Date(appointment.startsAt))} · {formatTimeFr(new Date(appointment.startsAt))}
                      </span>
                      <span className="block font-body-sm text-body-sm text-on-surface-variant">{visited ? `${visited.ref} · ${visited.title}` : "Bien supprimé"}</span>
                    </span>
                    <Badge tone={appointment.status === "scheduled" ? "info" : appointment.status === "done" ? "success" : "neutral"}>{APPOINTMENT_STATUS_LABELS[appointment.status]}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        <div className="min-w-0 space-y-space-lg">
          <Panel icon="contact_phone" title="Contact">
            <p className="font-body-md text-body-md text-on-surface">{lead.phone || "Téléphone non renseigné"}</p>
            {lead.email && <p className="font-body-md text-body-md text-on-surface-variant">{lead.email}</p>}
            <div className="mt-space-md grid grid-cols-2 gap-space-sm">
              <ButtonLink href={telLink(lead.phone)} variant="secondary" size="sm">
                <Icon name="call" className="text-[18px]" />
                Appeler
              </ButtonLink>
              <ButtonLink href={whatsappLink(lead.phone, interest)} variant="whatsapp" size="sm">
                <Icon name="chat" className="text-[18px]" />
                WhatsApp
              </ButtonLink>
            </div>
            <p className="mt-space-md flex items-center gap-1.5 font-label-sm text-label-sm text-on-surface-variant">
              <Icon name={SOURCE_ICONS[lead.source]} className="text-[16px]" />
              {SOURCE_LABELS[lead.source]}
            </p>
          </Panel>

          {listing && (
            <Panel icon="home_work" title="Bien concerné">
              <Link href={`/crm/biens/${listing.ref}/modifier`} className="flex items-center gap-space-sm hover:underline">
                <ListingThumb url={listing.photoUrl} alt={listing.photoAlt} />
                <span className="min-w-0">
                  <span className="block truncate font-label-md text-label-md font-semibold text-on-surface">{listing.title}</span>
                  <span className="block font-body-sm text-body-sm text-on-surface-variant">{listing.ref} · {formatAmount(listing.price)} TND</span>
                </span>
              </Link>
            </Panel>
          )}

          <Panel icon="badge" title="Agent responsable">
            <div className="flex items-center gap-space-sm">
              <Avatar name={agent.fullName} url={agent.avatarUrl || undefined} size={36} />
              <span className="font-label-md text-label-md font-semibold text-on-surface">{agent.fullName}</span>
            </div>
            {session.role === "admin" && (
              <ActionForm action={reassignLeadAction.bind(null, lead.id)} className="mt-space-md flex gap-space-sm">
                <SelectInput name="agentId" defaultValue={agent.id} aria-label="Réassigner à">
                  {agents.filter((candidate) => candidate.role === "agent").map((candidate) => (
                    <option key={candidate.id} value={candidate.id}>{candidate.fullName}</option>
                  ))}
                </SelectInput>
                <Button type="submit" variant="secondary">Réassigner</Button>
              </ActionForm>
            )}
          </Panel>

          <Panel icon="tune" title="Critères de recherche">
            <LeadCriteriaForm key={lead.updatedAt} leadId={lead.id} criteria={lead.criteria} />
          </Panel>

          <Panel icon="join_inner" title="Biens suggérés">
            {matches.length === 0 ? (
              <p className="font-body-md text-body-md text-on-surface-variant">Renseignez les critères pour obtenir des suggestions.</p>
            ) : (
              <ul className="space-y-space-sm">
                {matches.map(({ match, listing: suggested }) => (
                  <li key={suggested.id}>
                    <Link href={`/crm/biens/${suggested.ref}/modifier`} className="flex items-center gap-space-sm rounded-lg p-1 hover:bg-surface-container-low">
                      <ListingThumb url={suggested.photoUrl} alt={suggested.photoAlt} className="h-12 w-16" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-label-md text-label-md font-semibold text-on-surface">{suggested.title}</span>
                        <span className="block truncate font-label-sm text-label-sm text-on-surface-variant">{match.reasons.join(" · ")}</span>
                      </span>
                      <Badge tone={match.score >= 80 ? "success" : "info"}>{match.score}%</Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>
    </>
  );
}
