"use client";

import Link from "next/link";
import { useActionState, useRef } from "react";
import { loginAction, registerAction } from "@/app/actions/auth";
import { IDLE } from "@/lib/form-state";
import { Field, FormMessage } from "@/components/ui/form";
import { IconInput, PasswordInput, PasswordStrength, useFormFields } from "@/components/ui/field-kit";
import { Icon } from "@/components/ui/icon";
import { SubmitButton } from "@/components/ui/submit-button";

export interface DemoAccount {
  readonly label: string;
  readonly description: string;
  readonly email: string;
  readonly password: string;
  readonly icon: string;
}

export function LoginForm({ next, demoAccounts }: { next: string; demoAccounts: readonly DemoAccount[] }) {
  const [state, action] = useActionState(loginAction, IDLE);
  const { errors, bind, set } = useFormFields(state, { email: "", password: "" });
  const formRef = useRef<HTMLFormElement>(null);

  const signInAs = (account: DemoAccount) => {
    set("email", account.email);
    set("password", account.password);
    // The state update is applied before the browser reads the form, because requestSubmit runs in a microtask.
    queueMicrotask(() => formRef.current?.requestSubmit());
  };

  return (
    <div className="space-y-space-lg">
      <form ref={formRef} action={action} noValidate className="space-y-space-md">
        <input type="hidden" name="next" value={next} />
        <Field label="E-mail" htmlFor="email" error={errors.email}>
          <IconInput id="email" icon="mail" type="email" autoComplete="email" placeholder="vous@exemple.tn" error={errors.email} {...bind("email")} />
        </Field>
        <Field label="Mot de passe" htmlFor="password" error={errors.password}>
          <PasswordInput id="password" autoComplete="current-password" error={errors.password} {...bind("password")} />
        </Field>
        <FormMessage state={state} />
        <SubmitButton size="lg" className="w-full">
          Se connecter
        </SubmitButton>
      </form>

      {demoAccounts.length > 0 && (
        <div className="rounded-xl bg-surface-container-low p-space-md">
          <p className="font-label-md text-label-md font-semibold text-on-surface">Comptes de démonstration</p>
          <p className="mb-space-sm font-body-sm text-body-sm text-on-surface-variant">Un clic pour explorer chaque rôle.</p>
          <ul className="space-y-2">
            {demoAccounts.map((account) => (
              <li key={account.email}>
                <button
                  type="button"
                  onClick={() => signInAs(account)}
                  className="flex w-full items-center gap-space-sm rounded-lg bg-surface-container-lowest px-space-md py-2 text-left shadow-sm transition-colors hover:bg-surface-container-high"
                >
                  <Icon name={account.icon} className="text-[22px] text-primary" />
                  <span className="flex-1">
                    <span className="block font-label-md text-label-md font-semibold text-on-surface">{account.label}</span>
                    <span className="block font-body-sm text-body-sm text-on-surface-variant">{account.description}</span>
                  </span>
                  <Icon name="arrow_forward" className="text-[18px] text-outline" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="text-center font-body-md text-body-md text-on-surface-variant">
        Pas encore de compte ?{" "}
        <Link href={next === "/compte" ? "/inscription" : `/inscription?next=${encodeURIComponent(next)}`} className="font-semibold text-primary hover:underline">
          Créer un compte
        </Link>
      </p>
    </div>
  );
}

export function RegisterForm({ next }: { next: string }) {
  const [state, action] = useActionState(registerAction, IDLE);
  const { values, errors, bind } = useFormFields(state, { fullName: "", email: "", phone: "", password: "" });
  const missing = Object.keys(errors).length;

  return (
    <div className="space-y-space-lg">
      <form action={action} noValidate className="space-y-space-md">
        <input type="hidden" name="next" value={next} />
        <Field label="Nom complet" htmlFor="fullName" error={errors.fullName}>
          <IconInput id="fullName" icon="person" autoComplete="name" placeholder="Prénom Nom" error={errors.fullName} {...bind("fullName")} />
        </Field>
        <Field label="E-mail" htmlFor="email" error={errors.email}>
          <IconInput id="email" icon="mail" type="email" autoComplete="email" placeholder="vous@exemple.tn" error={errors.email} {...bind("email")} />
        </Field>
        <Field label="Téléphone / WhatsApp" htmlFor="phone" error={errors.phone} hint="Utilisé pour vos alertes de nouveaux biens.">
          <IconInput id="phone" icon="call" type="tel" autoComplete="tel" inputMode="tel" placeholder="98 123 456" error={errors.phone} {...bind("phone")} />
        </Field>
        <Field label="Mot de passe" htmlFor="password" error={errors.password}>
          <PasswordInput id="password" autoComplete="new-password" error={errors.password} {...bind("password")} />
          <PasswordStrength password={values.password} hasError={Boolean(errors.password)} />
        </Field>
        {state.status === "error" && missing > 1 && (
          <p className="font-label-md text-label-md text-error">{missing} champs à corriger.</p>
        )}
        <FormMessage state={state} />
        <SubmitButton size="lg" className="w-full">
          Créer mon compte
        </SubmitButton>
      </form>
      <p className="text-center font-body-md text-body-md text-on-surface-variant">
        Déjà inscrit ?{" "}
        <Link href={next === "/compte" ? "/connexion" : `/connexion?next=${encodeURIComponent(next)}`} className="font-semibold text-primary hover:underline">
          Se connecter
        </Link>
      </p>
    </div>
  );
}
