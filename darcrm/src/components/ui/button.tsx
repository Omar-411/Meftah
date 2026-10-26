import Link from "next/link";
import type { ButtonHTMLAttributes, ComponentProps } from "react";
import { cn } from "@/lib/cn";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "whatsapp" | "light";
export type ButtonSize = "sm" | "md" | "lg";

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-primary-container text-on-primary hover:bg-primary shadow-sm",
  secondary: "bg-surface-container-low text-on-surface hover:bg-surface-container-high",
  ghost: "text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface",
  danger: "bg-error-container text-on-error-container hover:bg-error hover:text-on-error",
  whatsapp: "bg-secondary text-on-secondary hover:bg-on-secondary-fixed-variant shadow-sm",
  light: "bg-surface-container-lowest text-primary hover:bg-surface-container-low shadow-sm",
};

const SIZES: Record<ButtonSize, string> = {
  sm: "h-8 px-space-md font-label-md text-label-md",
  md: "h-10 px-space-lg font-label-md text-label-md",
  lg: "h-12 px-space-xl font-headline-sm text-headline-sm",
};

export function buttonClass(variant: ButtonVariant = "primary", size: ButtonSize = "md", className?: string): string {
  return cn(
    "inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg transition-colors disabled:cursor-not-allowed disabled:opacity-60",
    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-container",
    VARIANTS[variant],
    SIZES[size],
    className,
  );
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export function Button({ variant, size, className, type = "button", ...props }: ButtonProps) {
  return <button type={type} className={buttonClass(variant, size, className)} {...props} />;
}

interface ButtonLinkProps extends ComponentProps<typeof Link> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export function ButtonLink({ variant, size, className, ...props }: ButtonLinkProps) {
  return <Link className={buttonClass(variant, size, className)} {...props} />;
}
