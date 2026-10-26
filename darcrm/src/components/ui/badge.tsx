import type { ReactNode } from "react";
import type { Tone } from "@/domain/shared/tone";
import { cn } from "@/lib/cn";

const TONE_CLASSES: Record<Tone, string> = {
  success: "bg-secondary-fixed/60 text-secondary font-medium",
  highlight: "bg-secondary-fixed/70 text-on-secondary-fixed font-semibold",
  warning: "bg-tertiary-fixed text-tertiary font-semibold",
  info: "bg-surface-container-high text-primary font-semibold",
  danger: "bg-error-container text-on-error-container font-semibold",
  neutral: "bg-surface-container-high text-on-surface-variant font-medium",
};

interface BadgeProps {
  tone: Tone;
  children: ReactNode;
  className?: string;
}

export function Badge({ tone, children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 font-label-sm text-label-sm",
        TONE_CLASSES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
