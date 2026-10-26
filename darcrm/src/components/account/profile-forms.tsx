"use client";

import { useActionState } from "react";
import { changePasswordAction, updateProfileAction } from "@/app/actions/profile";
import type { Profile } from "@/application/account/profile";
import { IDLE } from "@/lib/form-state";
import { Field, FormMessage, SectionCard } from "@/components/ui/form";
import { IconInput, PasswordInput, PasswordStrength, useFormFields } from "@/components/ui/field-kit";
import { SubmitButton } from "@/components/ui/submit-button";

export function ProfileInfoForm({ profile }: { profile: Profile }) {
  const staff = profile.whatsapp !== undefined;
  const [state, action] = useActionState(updateProfileAction, IDLE);
  const { errors, bind } = useFormFields(state, {
    fullName: profile.fullName,
    phone: profile.phone,
    whatsapp: profile.whatsapp ?? "",
    jobTitle: profile.jobTitle ?? "",
  });

  return (
    <SectionCard icon="person" title="Informations personnelles" subtitle="Ce que l'agence et vos contacts voient de vous.">
      <form action={action} noValidate className="grid gap-space-md sm:grid-cols-2">
        <Field label="Nom complet" htmlFor="fullName" error={errors.fullName} className="sm:col-span-2">
          <IconInput id="fullName" icon="person" autoComplete="name" error={errors.fullName} {...bind("fullName")} />
        </Field>
        <Field label="E-mail" htmlFor="email" hint="Identifiant de connexion, non modifiable ici." className="sm:col-span-2">
          <IconInput id="email" icon="mail" value={profile.email} readOnly disabled className="cursor-not-allowed opacity-70" />
        </Field>
        <Field label="Téléphone" htmlFor="phone" error={errors.phone}>
          <IconInput id="phone" icon="call" type="tel" inputMode="tel" autoComplete="tel" placeholder="98 123 456" error={errors.phone} {...bind("phone")} />
        </Field>
        {staff ? (
          <>
            <Field label="WhatsApp" htmlFor="whatsapp" error={errors.whatsapp} hint="Affiché sur vos annonces pour être contacté.">
              <IconInput id="whatsapp" icon="chat" type="tel" inputMode="tel" placeholder="+216 98 123 456" error={errors.whatsapp} {...bind("whatsapp")} />
            </Field>
            <Field label="Fonction" htmlFor="jobTitle" error={errors.jobTitle} className="sm:col-span-2">
              <IconInput id="jobTitle" icon="badge" placeholder="Conseiller immobilier" error={errors.jobTitle} {...bind("jobTitle")} />
            </Field>
          </>
        ) : (
          <p className="self-end pb-2 font-label-sm text-label-sm text-on-surface-variant">Utilisé pour vos alertes WhatsApp.</p>
        )}
        <div className="space-y-space-sm sm:col-span-2">
          <FormMessage state={state} />
          <SubmitButton icon="save">Enregistrer</SubmitButton>
        </div>
      </form>
    </SectionCard>
  );
}

export function PasswordForm() {
  const [state, action] = useActionState(changePasswordAction, IDLE);
  const { values, errors, bind } = useFormFields(state, { currentPassword: "", newPassword: "", confirmPassword: "" }, { resetOnSuccess: true });

  return (
    <SectionCard icon="lock" title="Sécurité" subtitle="Choisissez un mot de passe que vous n'utilisez nulle part ailleurs.">
      <form action={action} noValidate className="max-w-md space-y-space-md">
        <Field label="Mot de passe actuel" htmlFor="currentPassword" error={errors.currentPassword}>
          <PasswordInput id="currentPassword" autoComplete="current-password" error={errors.currentPassword} {...bind("currentPassword")} />
        </Field>
        <Field label="Nouveau mot de passe" htmlFor="newPassword" error={errors.newPassword}>
          <PasswordInput id="newPassword" autoComplete="new-password" error={errors.newPassword} {...bind("newPassword")} />
          <PasswordStrength password={values.newPassword} hasError={Boolean(errors.newPassword)} />
        </Field>
        <Field label="Confirmer le nouveau mot de passe" htmlFor="confirmPassword" error={errors.confirmPassword}>
          <PasswordInput id="confirmPassword" autoComplete="new-password" error={errors.confirmPassword} {...bind("confirmPassword")} />
        </Field>
        <FormMessage state={state} />
        <SubmitButton variant="secondary" icon="key">
          Modifier le mot de passe
        </SubmitButton>
      </form>
    </SectionCard>
  );
}
