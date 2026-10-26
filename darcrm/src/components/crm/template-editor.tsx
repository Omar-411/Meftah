"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import { resetTemplateAction, saveTemplateAction } from "@/app/actions/templates";
import { renderTemplate, TEMPLATE_VARIABLES, type MessageTemplate, type Variables } from "@/domain/message/template";
import { IDLE, type FormState } from "@/lib/form-state";
import { announce } from "@/lib/toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FormMessage, Textarea } from "@/components/ui/form";
import { Icon } from "@/components/ui/icon";
import { SubmitButton } from "@/components/ui/submit-button";

const SAMPLE: Variables = {
  prenom: "Amine",
  agent: "Sami Trabelsi",
  agence: "DarCRM Immobilier",
  telephone: "71 860 100",
  bien: "S+3 standing avec vaste terrasse",
  reference: "REF-1001",
  date: "mardi 27 octobre",
  heure: "10h30",
};

export function TemplateEditor({ templates }: { templates: readonly MessageTemplate[] }) {
  return (
    <ul className="space-y-space-lg">
      {templates.map((template) => (
        <TemplateCard key={`${template.key}:${template.body}`} template={template} />
      ))}
    </ul>
  );
}

function TemplateCard({ template }: { template: MessageTemplate }) {
  // The card is replaced once the saved text comes back from the server, so the toast is raised here rather than in an effect.
  const [state, action] = useActionState(async (previous: FormState, data: FormData) => {
    const result = await saveTemplateAction(template.key, previous, data);
    announce(result);
    return result;
  }, IDLE);
  const [pending, startTransition] = useTransition();
  const area = useRef<HTMLTextAreaElement>(null);
  const [body, setBody] = useState(template.body);
  const errors = state.fields ?? {};

  const insert = (name: string) => {
    const field = area.current;
    if (!field) return;
    const { selectionStart, selectionEnd } = field;
    setBody((current) => `${current.slice(0, selectionStart)}{${name}}${current.slice(selectionEnd)}`);
    const caret = selectionStart + name.length + 2;
    requestAnimationFrame(() => {
      field.focus();
      field.setSelectionRange(caret, caret);
    });
  };
  const reset = () => startTransition(async () => announce(await resetTemplateAction(template.key)));

  return (
    <li className="rounded-xl border border-outline-variant/50 p-space-md">
      <div className="mb-space-sm flex flex-wrap items-center gap-space-sm">
        <Icon name={template.icon} className="text-[20px] text-primary" />
        <h3 className="font-label-md text-label-md font-semibold text-on-surface">{template.label}</h3>
        {template.automatic && <Badge tone="info">Envoi automatique</Badge>}
        {template.customized && <Badge tone="highlight">Personnalisé</Badge>}
      </div>
      <p className="mb-space-sm font-body-sm text-body-sm text-on-surface-variant">{template.description}</p>

      <form action={action} noValidate className="space-y-space-sm">
        <Textarea ref={area} name="body" rows={4} value={body} onChange={(event) => setBody(event.target.value)} error={errors.body} aria-label={`Texte du modèle ${template.label}`} />
        <div className="flex flex-wrap gap-1" role="group" aria-label="Insérer une variable">
          {TEMPLATE_VARIABLES.map((variable) => (
            <button
              key={variable.name}
              type="button"
              title={variable.label}
              onClick={() => insert(variable.name)}
              className="rounded-full bg-surface-container-low px-2 py-0.5 font-label-sm text-label-sm text-primary hover:bg-surface-container-high"
            >
              {`{${variable.name}}`}
            </button>
          ))}
        </div>
        <p className="rounded-lg bg-surface-container-low p-space-sm font-body-sm text-body-sm text-on-surface-variant">
          <span className="font-semibold text-on-surface">Aperçu : </span>
          {renderTemplate(body, SAMPLE).text}
        </p>
        <FormMessage state={state} />
        <div className="flex flex-wrap items-center gap-space-sm">
          <SubmitButton icon="save" size="sm">Enregistrer</SubmitButton>
          {template.customized && (
            <Button type="button" size="sm" variant="ghost" disabled={pending} onClick={reset}>
              <Icon name="restart_alt" className="text-[18px]" />
              Rétablir le texte d'origine
            </Button>
          )}
        </div>
      </form>
    </li>
  );
}
