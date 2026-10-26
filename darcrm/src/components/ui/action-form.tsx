"use client";

import type { ComponentProps } from "react";
import type { FormState } from "@/lib/form-state";
import { announce } from "@/lib/toast";

interface ActionFormProps extends Omit<ComponentProps<"form">, "action"> {
  /** A server action that reports its outcome as a FormState. The result is shown as a toast. */
  action: (data: FormData) => Promise<FormState | void>;
}

/** A plain form whose server action has no inline UI: success and errors surface as toasts. */
export function ActionForm({ action, ...props }: ActionFormProps) {
  return <form {...props} action={async (data) => announce(await action(data))} />;
}
