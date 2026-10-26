"use client";

import { useActionState } from "react";
import { createStaffAccountAction } from "@/app/actions/users";
import { IDLE } from "@/lib/form-state";
import { Field, SelectInput } from "@/components/ui/form";
import { IconInput, PasswordInput, useFormFields } from "@/components/ui/field-kit";
import { SubmitButton } from "@/components/ui/submit-button";
import { FormMessage } from "@/components/ui/form";

const INITIAL = { fullName: "", email: "", phone: "", jobTitle: "", password: "", role: "agent" };

export function CreateStaffForm() {
  const [state, action] = useActionState(createStaffAccountAction, IDLE);
  const { values, errors, bind, set } = useFormFields(state, INITIAL, { resetOnSuccess: true });

  return (
    <form action={action} noValidate className="grid gap-space-md sm:grid-cols-2">
      <Field label="Nom complet" htmlFor="fullName" error={errors.fullName}>
        <IconInput id="fullName" icon="person" autoComplete="off" error={errors.fullName} {...bind("fullName")} />
      </Field>
      <Field label="E-mail de connexion" htmlFor="email" error={errors.email}>
        <IconInput id="email" icon="mail" type="email" autoComplete="off" error={errors.email} {...bind("email")} />
      </Field>
      <Field label="Téléphone" htmlFor="phone" error={errors.phone}>
        <IconInput id="phone" icon="call" type="tel" inputMode="tel" placeholder="98 123 456" error={errors.phone} {...bind("phone")} />
      </Field>
      <Field label="Fonction" htmlFor="jobTitle" hint="Facultatif. Affiché sur les annonces." error={errors.jobTitle}>
        <IconInput id="jobTitle" icon="badge" placeholder="Conseiller immobilier" error={errors.jobTitle} {...bind("jobTitle")} />
      </Field>
      <Field label="Mot de passe provisoire" htmlFor="password" hint="8 caractères minimum. À transmettre à la personne, qui pourra le changer dans son profil." error={errors.password}>
        <PasswordInput id="password" autoComplete="new-password" error={errors.password} {...bind("password")} />
      </Field>
      <Field label="Rôle" htmlFor="role" hint="Un administrateur voit toute l'agence et gère les comptes.">
        <SelectInput id="role" name="role" value={values.role} onChange={(event) => set("role", event.target.value)}>
          <option value="agent">Agent</option>
          <option value="admin">Administrateur</option>
        </SelectInput>
      </Field>
      <div className="space-y-space-sm sm:col-span-2">
        <FormMessage state={state} />
        <SubmitButton icon="person_add">Créer le compte</SubmitButton>
      </div>
    </form>
  );
}
