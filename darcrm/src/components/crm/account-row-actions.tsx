"use client";

import { changeRoleAction, setActiveAction } from "@/app/actions/users";
import { useRef, useTransition } from "react";
import type { ManagedAccount } from "@/domain/account/managed-account";
import { announce } from "@/lib/toast";
import { ActionForm } from "@/components/ui/action-form";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";

interface Props {
  account: ManagedAccount;
  isSelf: boolean;
}

/** Role is editable for staff only: a visitor account is never promoted, an agent account is created for that. */
export function AccountRowActions({ account, isSelf }: Props) {
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();
  const toggle = () => startTransition(async () => announce(await setActiveAction(account.id, !account.active)));

  return (
    <div className="flex flex-wrap items-center justify-end gap-space-sm">
      {account.role !== "user" && (
        <ActionForm ref={formRef} action={changeRoleAction.bind(null, account.id)}>
          <select
            name="role"
            defaultValue={account.role}
            disabled={isSelf}
            aria-label={`Rôle de ${account.fullName}`}
            title={isSelf ? "Vous ne pouvez pas modifier votre propre rôle." : undefined}
            onChange={() => formRef.current?.requestSubmit()}
            className="h-8 cursor-pointer rounded-md border border-outline-variant bg-surface-container-lowest px-2 font-label-sm text-label-sm text-on-surface disabled:cursor-not-allowed disabled:opacity-60"
          >
            <option value="agent">Agent</option>
            <option value="admin">Administrateur</option>
          </select>
        </ActionForm>
      )}
      <Button
        type="button"
        size="sm"
        variant={account.active ? "ghost" : "secondary"}
        disabled={pending || (isSelf && account.active)}
        title={isSelf && account.active ? "Vous ne pouvez pas désactiver votre propre compte." : undefined}
        onClick={toggle}
      >
        <Icon name={account.active ? "block" : "check_circle"} className="text-[18px]" />
        {account.active ? "Désactiver" : "Réactiver"}
      </Button>
    </div>
  );
}
