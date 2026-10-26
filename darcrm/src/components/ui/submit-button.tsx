"use client";

import { useFormStatus } from "react-dom";
import { Icon } from "./icon";
import { Button, type ButtonSize, type ButtonVariant } from "./button";
import { cn } from "@/lib/cn";

interface SubmitButtonProps {
  children: React.ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: string;
  className?: string;
}

export function SubmitButton({ children, variant, size, icon, className }: SubmitButtonProps) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant={variant} size={size} disabled={pending} className={className}>
      <Icon name={pending ? "progress_activity" : (icon ?? "")} className={cn("text-[18px]", pending && "animate-spin", !pending && !icon && "hidden")} />
      <span>{children}</span>
    </Button>
  );
}
