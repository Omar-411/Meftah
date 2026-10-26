import type { Metadata } from "next";
import Link from "next/link";
import { listAccounts } from "@/application/crm/users";
import type { ManagedAccount } from "@/domain/account/managed-account";
import { ROLE_LABELS, type Role } from "@/domain/auth/session";
import { pluralize } from "@/domain/shared/format";
import { getDeps } from "@/infrastructure/container";
import { AccountRowActions } from "@/components/crm/account-row-actions";
import { CreateStaffForm } from "@/components/crm/create-staff-form";
import { PageHeader } from "@/components/crm/page-header";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";
import { Panel } from "@/components/ui/panel";
import { cn } from "@/lib/cn";
import { loadOrRedirect, requireAdminPage } from "../_lib/guard";

export const metadata: Metadata = { title: "Utilisateurs" };

const FILTERS: readonly { value: Role | "all"; label: string }[] = [
  { value: "all", label: "Tous" },
  { value: "admin", label: "Administrateurs" },
  { value: "agent", label: "Agents" },
  { value: "user", label: "Visiteurs" },
];

const parseFilter = (value: string | undefined): Role | "all" => (value === "admin" || value === "agent" || value === "user" ? value : "all");
const matches = (account: ManagedAccount, query: string) => [account.fullName, account.email, account.phone].some((field) => field.toLowerCase().includes(query));

export default async function UsersPage({ searchParams }: { searchParams: Promise<{ role?: string; q?: string }> }) {
  const { role: rawRole, q: rawQuery } = await searchParams;
  const session = await requireAdminPage();
  const accounts = await loadOrRedirect(() => listAccounts(getDeps(), session));
  const filter = parseFilter(rawRole);
  const query = (rawQuery ?? "").trim().toLowerCase();
  const visible = accounts.filter((account) => (filter === "all" || account.role === filter) && (query === "" || matches(account, query)));
  const countOf = (value: Role | "all") => (value === "all" ? accounts.length : accounts.filter((account) => account.role === value).length);
  const hrefFor = (value: Role | "all") => `/crm/utilisateurs${value === "all" ? "" : `?role=${value}`}`;

  return (
    <>
      <PageHeader title="Utilisateurs" subtitle={`${pluralize(accounts.length, "compte")} au total : équipe de l'agence et visiteurs inscrits.`} />

      <div className="space-y-space-lg">
        <Panel icon="person_add" title="Nouveau compte agence">
          <CreateStaffForm />
        </Panel>

        <Panel icon="manage_accounts" title="Comptes">
          <div className="mb-space-md flex flex-wrap items-center justify-between gap-space-md">
            <nav aria-label="Filtrer par rôle" className="flex flex-wrap gap-space-xs">
              {FILTERS.map(({ value, label }) => (
                <Link
                  key={value}
                  href={hrefFor(value)}
                  aria-current={filter === value ? "page" : undefined}
                  className={cn(
                    "rounded-full px-3 py-1 font-label-md text-label-md",
                    filter === value ? "bg-primary text-on-primary" : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high",
                  )}
                >
                  {label} <span className="opacity-70">{countOf(value)}</span>
                </Link>
              ))}
            </nav>
            <form className="flex items-center gap-space-sm" role="search">
              {filter !== "all" && <input type="hidden" name="role" value={filter} />}
              <input
                name="q"
                defaultValue={rawQuery ?? ""}
                placeholder="Nom, e-mail, téléphone"
                aria-label="Rechercher un compte"
                className="h-9 w-56 rounded-md border border-outline-variant bg-surface-container-lowest px-3 font-body-md text-body-md"
              />
              <button type="submit" className="h-9 rounded-md bg-surface-container-high px-3 font-label-md text-label-md text-on-surface">Rechercher</button>
            </form>
          </div>

          {visible.length === 0 ? (
            <p className="py-space-md font-body-md text-body-md text-on-surface-variant">Aucun compte ne correspond à cette recherche.</p>
          ) : (
            <ul className="divide-y divide-outline-variant/40">
              {visible.map((account) => (
                <li key={account.id} className="flex flex-wrap items-center gap-space-md py-space-md">
                  <Avatar name={account.fullName} size={40} />
                  <div className="min-w-0 flex-1 basis-56">
                    <p className={cn("truncate font-label-md text-label-md font-semibold", account.active ? "text-on-surface" : "text-on-surface-variant line-through")}>
                      {account.fullName}
                      {account.id === session.userId && <span className="ml-2 font-normal text-on-surface-variant">(vous)</span>}
                    </p>
                    <p className="flex flex-wrap items-center gap-x-3 font-body-sm text-body-sm text-on-surface-variant">
                      <span className="inline-flex items-center gap-1"><Icon name="mail" className="text-[14px]" />{account.email}</span>
                      {account.phone && <span className="inline-flex items-center gap-1"><Icon name="call" className="text-[14px]" />{account.phone}</span>}
                    </p>
                  </div>
                  <div className="flex items-center gap-space-xs">
                    <Badge tone={account.role === "admin" ? "highlight" : account.role === "agent" ? "info" : "neutral"}>{ROLE_LABELS[account.role]}</Badge>
                    {!account.active && <Badge tone="danger">Désactivé</Badge>}
                  </div>
                  <AccountRowActions account={account} isSelf={account.id === session.userId} />
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </>
  );
}
