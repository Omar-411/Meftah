"use client";

import { useState } from "react";
import { logMessageSentAction } from "@/app/actions/templates";
import type { ComposedMessage } from "@/application/crm/templates";
import { whatsappLink } from "@/domain/shared/format";
import { announce, toast } from "@/lib/toast";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Textarea } from "@/components/ui/form";

const MISSING_HINT = "Planifiez d'abord une visite pour ce prospect.";

interface Props {
  leadId: string;
  phone: string;
  messages: readonly ComposedMessage[];
}

/** Pick a ready-made message, adjust it, and open it in WhatsApp. Sending is logged on the lead's journal. */
export function WhatsappComposer({ leadId, phone, messages }: Props) {
  const firstReady = messages.find((message) => message.missing.length === 0) ?? messages[0];
  const [selectedKey, setSelectedKey] = useState(firstReady?.key);
  const selected = messages.find((message) => message.key === selectedKey) ?? firstReady;
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  if (!selected) return null;
  const text = drafts[selected.key] ?? selected.text;
  const edited = text !== selected.text;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Message copié.");
    } catch {
      toast.error("Impossible de copier : sélectionnez le texte manuellement.");
    }
  };

  return (
    <div className="space-y-space-md">
      <div className="flex flex-wrap gap-space-xs" role="group" aria-label="Modèles de message">
        {messages.map((message) => {
          const blocked = message.missing.length > 0;
          return (
            <button
              key={message.key}
              type="button"
              disabled={blocked}
              title={blocked ? MISSING_HINT : message.description}
              aria-pressed={selected.key === message.key}
              onClick={() => setSelectedKey(message.key)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 font-label-md text-label-md transition-colors disabled:cursor-not-allowed disabled:opacity-50",
                selected.key === message.key ? "bg-primary text-on-primary" : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high",
              )}
            >
              <Icon name={message.icon} className="text-[16px]" />
              {message.label}
            </button>
          );
        })}
      </div>

      <div>
        <label htmlFor="wa-text" className="sr-only">Texte du message</label>
        <Textarea id="wa-text" rows={5} value={text} onChange={(event) => setDrafts((current) => ({ ...current, [selected.key]: event.target.value }))} />
        <p className="mt-1 flex items-center justify-between font-label-sm text-label-sm text-on-surface-variant">
          <span>{selected.description}</span>
          {edited && (
            <button type="button" className="text-primary hover:underline" onClick={() => setDrafts((current) => ({ ...current, [selected.key]: selected.text }))}>
              Rétablir le texte du modèle
            </button>
          )}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-space-sm">
        <a
          href={whatsappLink(phone, text)}
          target="_blank"
          rel="noreferrer"
          onClick={() => void logMessageSentAction(leadId, selected.label).then(announce)}
          className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#25D366] px-4 font-label-md text-label-md font-semibold text-white hover:brightness-95"
        >
          <Icon name="chat" className="text-[18px]" />
          Ouvrir dans WhatsApp
        </a>
        <Button type="button" variant="secondary" onClick={copy}>
          <Icon name="content_copy" className="text-[18px]" />
          Copier
        </Button>
      </div>
    </div>
  );
}
