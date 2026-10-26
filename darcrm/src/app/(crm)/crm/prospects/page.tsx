import type { Metadata } from "next";
import Link from "next/link";
import { listAgentOptions } from "@/application/crm/admin";
import { listLeads } from "@/application/crm/leads";
import { groupByStage, LEAD_STAGES, STAGE_LABELS, type LeadStage } from "@/domain/lead/lead";
import { formatRelativeFr, pluralize } from "@/domain/shared/format";
import { getDeps } from "@/infrastructure/container";
import { StageBadge } from "@/components/crm/badges";
import { LeadCard } from "@/components/crm/lead-card";
import { PageHeader } from "@/components/crm/page-header";
import { Button, ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { SelectInput, TextInput } from "@/components/ui/form";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";
import { loadOrRedirect, requireStaffPage } from "../_lib/guard";

export const metadata: Metadata = { title: "Prospects" };

type SearchParams = Promise<Record<string, string | undefined>>;

export default async function LeadsPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await requireStaffPage("/crm/prospects");
  const params = await searchParams;
  const view = params.vue === "liste" ? "list" : "board";
  const stage = LEAD_STAGES.find((value) => value === params.etape) as LeadStage | undefined;
  const q = params.q?.trim() || undefined;
  const agentId = session.role === "admin" ? params.agent || undefined : undefined;

  const deps = getDeps();
  const now = new Date();
  const [cards, agents] = await loadOrRedirect(() => Promise.all([listLeads(deps, session, { q, stage, agentId }), listAgentOptions(deps, session)]));
  const grouped = groupByStage(cards.map((card) => ({ ...card, stage: card.lead.stage })));
  const isAdmin = session.role === "admin";
  const filtered = Boolean(q || stage || agentId);

  const tab = (value: "board" | "list", label: string, icon: string, href: string) => (
    <Link
      href={href}
      aria-current={view === value ? "page" : undefined}
      className={cn("flex items-center gap-1.5 rounded-md px-space-md py-1.5 font-label-md text-label-md", view === value ? "bg-surface-container-lowest font-semibold text-primary shadow-sm" : "text-on-surface-variant hover:text-on-surface")}
    >
      <Icon name={icon} className="text-[18px]" />
      {label}
    </Link>
  );

  return (
    <>
      <PageHeader
        title="Prospects"
        subtitle={`${pluralize(cards.length, "prospect")}${isAdmin ? " dans l'agence" : ""}`}
        actions={
          <>
            <div className="inline-flex rounded-lg bg-surface-container-low p-1">
              {tab("board", "Pipeline", "view_kanban", "/crm/prospects")}
              {tab("list", "Liste", "view_list", "/crm/prospects?vue=liste")}
            </div>
            <ButtonLink href="/crm/prospects/nouveau">
              <Icon name="person_add" className="text-[20px]" />
              Nouveau prospect
            </ButtonLink>
          </>
        }
      />

      <form method="get" className="mb-space-md grid gap-space-sm rounded-xl bg-surface-container-lowest p-space-md shadow-sm sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_auto]">
        {view === "list" && <input type="hidden" name="vue" value="liste" />}
        <TextInput name="q" placeholder="Nom, téléphone ou e-mail" defaultValue={q} aria-label="Rechercher un prospect" />
        <SelectInput name="etape" defaultValue={stage ?? ""} aria-label="Étape">
          <option value="">Toutes les étapes</option>
          {LEAD_STAGES.map((value) => (
            <option key={value} value={value}>{STAGE_LABELS[value]}</option>
          ))}
        </SelectInput>
        {isAdmin ? (
          <SelectInput name="agent" defaultValue={agentId ?? ""} aria-label="Agent">
            <option value="">Tous les agents</option>
            {agents.filter((agent) => agent.role === "agent").map((agent) => (
              <option key={agent.id} value={agent.id}>{agent.fullName}</option>
            ))}
          </SelectInput>
        ) : (
          <span className="hidden lg:block" />
        )}
        <div className="flex gap-space-sm">
          <Button type="submit" variant="secondary">Filtrer</Button>
          {filtered && <ButtonLink href={view === "list" ? "/crm/prospects?vue=liste" : "/crm/prospects"} variant="ghost">Effacer</ButtonLink>}
        </div>
      </form>

      {cards.length === 0 ? (
        <EmptyState
          icon="groups"
          title={filtered ? "Aucun prospect ne correspond" : "Aucun prospect pour le moment"}
          description={filtered ? "Modifiez ou effacez les filtres." : "Les demandes du site arrivent ici automatiquement. Vous pouvez aussi ajouter un contact reçu par téléphone ou WhatsApp."}
          action={<ButtonLink href="/crm/prospects/nouveau">Ajouter un prospect</ButtonLink>}
        />
      ) : view === "board" ? (
        <div className="-mx-space-md overflow-x-auto px-space-md pb-space-sm">
          <div className="grid min-w-[1180px] grid-cols-6 gap-space-sm">
            {LEAD_STAGES.map((value) => (
              <section key={value} aria-label={STAGE_LABELS[value]} className="rounded-xl bg-surface-container-low p-space-sm">
                <h2 className="mb-space-sm flex items-center justify-between px-1 font-label-md text-label-md font-semibold text-on-surface">
                  {STAGE_LABELS[value]}
                  <span className="rounded-full bg-surface-container-lowest px-2 font-label-sm text-label-sm text-on-surface-variant">{grouped[value].length}</span>
                </h2>
                <div className="space-y-space-sm">
                  {grouped[value].map((card) => (
                    <LeadCard key={card.lead.id} data={card} now={now} showAgent={isAdmin} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl bg-surface-container-lowest shadow-sm">
          <ul className="divide-y divide-outline-variant/30">
            {cards.map(({ lead, listing, agentName }) => (
              <li key={lead.id}>
                <Link href={`/crm/prospects/${lead.id}`} className="flex flex-wrap items-center gap-space-md px-space-md py-space-sm hover:bg-surface-container-low">
                  <span className="min-w-[200px] flex-1">
                    <span className="block font-label-md text-label-md font-semibold text-on-surface">{lead.fullName}</span>
                    <span className="block truncate font-body-sm text-body-sm text-on-surface-variant">{listing ? `${listing.ref} · ${listing.title}` : lead.message || lead.phone}</span>
                  </span>
                  <StageBadge stage={lead.stage} />
                  {isAdmin && <span className="w-32 font-body-sm text-body-sm text-on-surface-variant">{agentName}</span>}
                  <span className="w-28 text-right font-label-sm text-label-sm text-outline">{formatRelativeFr(new Date(lead.lastContactAt ?? lead.createdAt), now)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
