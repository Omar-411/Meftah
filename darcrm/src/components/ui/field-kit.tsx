"use client";

import { useState, type ChangeEvent, type ReactNode } from "react";
import type { FormState } from "@/lib/form-state";
import { cn } from "@/lib/cn";
import { inputClass } from "@/components/ui/form";
import { Icon } from "@/components/ui/icon";

/**
 * Field values live in React state, so a failed submit never wipes the form (React resets uncontrolled inputs after an action).
 * An error disappears as soon as its field is edited; the others stay until the next submit.
 */
export function useFormFields<K extends string>(state: FormState, initial: Record<K, string>, options: { resetOnSuccess?: boolean } = {}) {
  const [values, setValues] = useState(initial);
  const [edited, setEdited] = useState<ReadonlySet<string>>(new Set());
  const [seenState, setSeenState] = useState(state);
  if (seenState !== state) {
    setSeenState(state);
    setEdited(new Set());
    if (options.resetOnSuccess && state.status === "success") setValues(initial);
  }

  const errors: Record<string, string | undefined> = {};
  for (const [key, message] of Object.entries(state.fields ?? {})) if (!edited.has(key)) errors[key] = message;

  const bind = (key: K) => ({
    name: key,
    value: values[key],
    onChange: (event: ChangeEvent<HTMLInputElement>) => {
      setValues((current) => ({ ...current, [key]: event.target.value }));
      setEdited((current) => new Set(current).add(key));
    },
  });
  const set = (key: K, value: string) => setValues((current) => ({ ...current, [key]: value }));
  return { values, errors, bind, set };
}

export function IconInput({ icon, error, trailing, className, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { icon: string; error?: string; trailing?: ReactNode }) {
  return (
    <div className="relative">
      <Icon name={icon} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-outline" />
      <input
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${props.id}-error` : undefined}
        className={cn(inputClass, "h-11 pl-10", trailing ? "pr-11" : undefined, className)}
        {...props}
      />
      {trailing && <div className="absolute right-1 top-1/2 -translate-y-1/2">{trailing}</div>}
    </div>
  );
}

export function PasswordInput({ error, ...props }: Omit<React.ComponentProps<typeof IconInput>, "icon" | "type" | "trailing">) {
  const [visible, setVisible] = useState(false);
  return (
    <IconInput
      {...props}
      icon="lock"
      error={error}
      type={visible ? "text" : "password"}
      trailing={
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? "Masquer le mot de passe" : "Afficher le mot de passe"}
          aria-pressed={visible}
          className="flex h-9 w-9 items-center justify-center rounded-md text-outline transition-colors hover:bg-surface-container-high hover:text-on-surface"
        >
          <Icon name={visible ? "visibility_off" : "visibility"} className="text-[20px]" />
        </button>
      }
    />
  );
}

export const MIN_PASSWORD = 8;

export function PasswordStrength({ password, hasError }: { password: string; hasError: boolean }) {
  const long = password.length >= MIN_PASSWORD;
  const mixed = /[a-zA-Z]/.test(password) && /\d/.test(password);
  const score = password.length === 0 ? 0 : !long ? 1 : mixed && password.length >= 12 ? 3 : 2;
  const labels = ["", "Trop court", "Correct", "Solide"];
  return (
    <div className="mt-2" aria-live="polite">
      <div className="flex gap-1" aria-hidden="true">
        {[1, 2, 3].map((level) => (
          <span key={level} className={cn("h-1 flex-1 rounded-full bg-surface-container-high transition-colors", score >= level && (score === 1 ? "bg-error" : score === 2 ? "bg-tertiary-container" : "bg-secondary"))} />
        ))}
      </div>
      <p className={cn("mt-1 flex items-center gap-1 font-label-sm text-label-sm", long ? "text-secondary" : "text-on-surface-variant", hasError && "hidden")}>
        <Icon name={long ? "check_circle" : "radio_button_unchecked"} className="text-[14px]" />
        {MIN_PASSWORD} caractères minimum{score > 0 && ` · ${labels[score]}`}
      </p>
    </div>
  );
}

