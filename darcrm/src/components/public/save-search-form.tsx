"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { saveSearchAction } from "@/app/actions/public";
import { IDLE } from "@/lib/form-state";
import { Button, buttonClass } from "@/components/ui/button";
import { Field, FormMessage, TextInput } from "@/components/ui/form";
import { Icon } from "@/components/ui/icon";
import { SubmitButton } from "@/components/ui/submit-button";

interface SaveSearchFormProps {
  /** The current URL query string, so the saved search equals what the visitor is looking at. */
  queryString: string;
  /** null when signed in as a visitor; otherwise where to send them to log in. */
  loginHref: string | null;
  defaultPhone: string;
  alertsEnabled: boolean;
  disabled: boolean;
}

export function SaveSearchForm({ queryString, loginHref, defaultPhone, alertsEnabled, disabled }: SaveSearchFormProps) {
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState(saveSearchAction.bind(null, queryString), IDLE);

  if (loginHref) {
    return (
      <Link href={loginHref} className={buttonClass("secondary", "md")}>
        <Icon name="notifications" className="text-[20px]" />
        Me prévenir des nouveautés
      </Link>
    );
  }

  return (
    <div className="relative">
      <Button variant="secondary" onClick={() => setOpen((value) => !value)} aria-expanded={open} disabled={disabled}>
        <Icon name="notifications" className="text-[20px]" />
        Enregistrer cette recherche
      </Button>

      {open && (
        <form action={action} className="absolute right-0 z-20 mt-2 w-[min(92vw,360px)] space-y-space-md rounded-xl bg-surface-container-lowest p-space-md shadow-xl">
          {alertsEnabled && (
            <>
              <label className="flex items-start gap-2 font-body-md text-body-md text-on-surface">
                <input type="checkbox" name="whatsappAlerts" defaultChecked className="mt-1 h-4 w-4 accent-secondary" />
                <span>Me prévenir sur WhatsApp quand un nouveau bien correspond</span>
              </label>
              <Field label="Numéro WhatsApp" htmlFor="save-whatsapp" error={state.fields?.whatsappPhone}>
                <TextInput id="save-whatsapp" name="whatsappPhone" type="tel" defaultValue={defaultPhone} placeholder="98 123 456" error={state.fields?.whatsappPhone} />
              </Field>
            </>
          )}
          <FormMessage state={state} />
          <SubmitButton icon="bookmark_add" className="w-full">
            Enregistrer
          </SubmitButton>
        </form>
      )}
    </div>
  );
}
