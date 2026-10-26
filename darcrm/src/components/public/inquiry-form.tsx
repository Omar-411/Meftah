"use client";

import { useActionState } from "react";
import { submitInquiryAction } from "@/app/actions/public";
import { IDLE } from "@/lib/form-state";
import { Field, FormMessage, TextInput, Textarea } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";

interface InquiryFormProps {
  slug: string;
  listingRef: string;
  defaultName?: string;
}

export function InquiryForm({ slug, listingRef, defaultName }: InquiryFormProps) {
  const [state, action] = useActionState(submitInquiryAction.bind(null, slug), IDLE);
  const errors = state.fields ?? {};

  if (state.status === "success") return <FormMessage state={state} inlineSuccess />;

  return (
    <form action={action} className="space-y-space-md">
      <Field label="Nom complet" htmlFor="fullName" error={errors.fullName}>
        <TextInput id="fullName" name="fullName" autoComplete="name" defaultValue={defaultName} error={errors.fullName} />
      </Field>
      <Field label="Téléphone" htmlFor="phone" error={errors.phone}>
        <TextInput id="phone" name="phone" type="tel" autoComplete="tel" placeholder="98 123 456" error={errors.phone} />
      </Field>
      <Field label="E-mail (facultatif)" htmlFor="email" error={errors.email}>
        <TextInput id="email" name="email" type="email" autoComplete="email" error={errors.email} />
      </Field>
      <Field label="Message" htmlFor="message" error={errors.message}>
        <Textarea id="message" name="message" rows={3} defaultValue={`Bonjour, je suis intéressé(e) par le bien ${listingRef}. Pouvez-vous me rappeler ?`} error={errors.message} />
      </Field>
      <FormMessage state={state} />
      <SubmitButton icon="send" size="lg" className="w-full">
        Envoyer ma demande
      </SubmitButton>
    </form>
  );
}
