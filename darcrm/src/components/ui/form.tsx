"use client";

import { useEffect, type ComponentProps, type InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";
import type { FormState } from "@/lib/form-state";
import { formatAmount } from "@/domain/shared/format";
import { cn } from "@/lib/cn";
import { announce } from "@/lib/toast";
import { Icon } from "./icon";

export const inputClass =
  "w-full h-10 px-space-md bg-surface-container-low rounded-lg text-on-surface font-body-md text-body-md placeholder:text-outline " +
  "border border-transparent focus:outline-none focus:border-primary-container focus:ring-2 focus:ring-primary-container/20 transition-all " +
  "aria-[invalid=true]:border-error aria-[invalid=true]:bg-error-container/30";

interface FieldProps {
  label: string;
  htmlFor: string;
  hint?: ReactNode;
  error?: string;
  aside?: ReactNode;
  className?: string;
  children: ReactNode;
}

export function Field({ label, htmlFor, hint, error, aside, className, children }: FieldProps) {
  return (
    <div className={className}>
      <div className="mb-1 flex items-center justify-between gap-2">
        <label htmlFor={htmlFor} className="font-label-md text-label-md text-on-surface">
          {label}
        </label>
        {aside}
      </div>
      {children}
      {error ? (
        <p id={`${htmlFor}-error`} role="alert" className="mt-1 font-label-sm text-label-sm text-error">
          {error}
        </p>
      ) : (
        hint && <p className="mt-1 font-label-sm text-label-sm text-on-surface-variant">{hint}</p>
      )}
    </div>
  );
}

export function TextInput({ className, error, ...props }: InputHTMLAttributes<HTMLInputElement> & { error?: string }) {
  return <input type="text" aria-invalid={error ? true : undefined} className={cn(inputClass, className)} {...props} />;
}

export function Textarea({ className, error, ...props }: ComponentProps<"textarea"> & { error?: string }) {
  return (
    <textarea
      aria-invalid={error ? true : undefined}
      className={cn(inputClass, "h-auto min-h-24 resize-y py-2 leading-relaxed", className)}
      {...props}
    />
  );
}

export function SelectInput({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select className={cn(inputClass, "cursor-pointer appearance-none pr-8", className)} {...props}>
        {children}
      </select>
      <Icon name="expand_more" className="pointer-events-none absolute right-3 top-2.5 text-[20px] text-outline" />
    </div>
  );
}

interface UnitInputProps {
  id: string;
  value: number;
  onChange: (value: number) => void;
  unit: string;
  unitWidthClass?: string;
  emphasized?: boolean;
  error?: string;
}

/** Digits-only numeric field with a fixed unit suffix (TND, m²...). */
export function UnitInput({ id, value, onChange, unit, unitWidthClass = "pr-12", emphasized, error }: UnitInputProps) {
  return (
    <div className="relative flex items-center">
      <input
        id={id}
        type="text"
        inputMode="numeric"
        aria-invalid={error ? true : undefined}
        value={formatAmount(value)}
        onChange={(event) => onChange(Number(event.target.value.replace(/\D/g, "")) || 0)}
        className={cn(inputClass, unitWidthClass, emphasized && "font-currency-display text-currency-display")}
      />
      <span className="pointer-events-none absolute right-3 font-label-md text-label-md font-semibold text-on-surface-variant">{unit}</span>
    </div>
  );
}

interface StepperProps {
  id: string;
  value: number;
  min?: number;
  max?: number;
  format: (value: number) => string;
  onChange: (value: number) => void;
}

export function Stepper({ id, value, min = 0, max = 20, format, onChange }: StepperProps) {
  const stepButton =
    "flex h-8 w-8 items-center justify-center rounded bg-surface-container-lowest font-headline-sm text-headline-sm font-bold text-on-surface transition-colors hover:bg-surface-container disabled:opacity-40";
  return (
    <div className="flex h-10 items-center rounded-lg bg-surface-container-low px-space-xs">
      <button type="button" aria-label="Diminuer" className={stepButton} disabled={value <= min} onClick={() => onChange(value - 1)}>
        -
      </button>
      <output id={id} className="w-full text-center font-label-md text-label-md text-on-surface">
        {format(value)}
      </output>
      <button type="button" aria-label="Augmenter" className={stepButton} disabled={value >= max} onClick={() => onChange(value + 1)}>
        +
      </button>
    </div>
  );
}

interface SegmentedProps<T extends string> {
  label: string;
  value: T;
  options: ReadonlyArray<{ value: T; label: string; dotClassName?: string }>;
  onChange: (value: T) => void;
  fullWidth?: boolean;
}

export function Segmented<T extends string>({ label, value, options, onChange, fullWidth }: SegmentedProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn("rounded-lg bg-surface-container-low p-1", fullWidth ? "grid" : "inline-flex")}
      style={fullWidth ? { gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` } : undefined}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.value)}
            className={cn(
              "flex items-center justify-center gap-1 rounded-md px-space-md py-1.5 font-label-md text-label-md transition-all",
              active ? "bg-surface-container-lowest font-semibold text-primary shadow-sm" : "text-on-surface-variant hover:text-on-surface",
            )}
          >
            {active && option.dotClassName && <span className={cn("h-1.5 w-1.5 rounded-full", option.dotClassName)} />}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Every form already renders this with its action state, so it is the single place that raises the toast.
 * Errors also stay inline (next to the fields); success is toast-only unless `inlineSuccess` replaces the form.
 */
export function FormMessage({ state, inlineSuccess = false }: { state: FormState; inlineSuccess?: boolean }) {
  useEffect(() => {
    announce(state);
  }, [state]);

  if (state.status === "idle" || !state.message) return null;
  const isError = state.status === "error";
  if (!isError && !inlineSuccess) return null;
  return (
    <p
      role={isError ? "alert" : "status"}
      className={cn(
        "flex items-start gap-2 rounded-lg px-space-md py-2 font-body-sm text-body-sm",
        isError ? "bg-error-container text-on-error-container" : "bg-secondary-container/50 text-on-secondary-container",
      )}
    >
      <Icon name={isError ? "error" : "check_circle"} className="mt-0.5 text-[18px]" />
      <span>{state.message}</span>
    </p>
  );
}

export function SectionCard({
  icon,
  title,
  subtitle,
  aside,
  children,
}: {
  icon: string;
  title: string;
  subtitle?: string;
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl bg-surface-container-lowest p-space-lg shadow-sm">
      <div className="mb-space-md flex items-center justify-between gap-space-sm">
        <div className="flex items-center gap-space-sm">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-container-low text-primary">
            <Icon name={icon} className="text-[20px]" />
          </span>
          <div>
            <h2 className="font-headline-sm text-headline-sm text-on-surface">{title}</h2>
            {subtitle && <p className="font-body-sm text-body-sm text-on-surface-variant">{subtitle}</p>}
          </div>
        </div>
        {aside}
      </div>
      {children}
    </section>
  );
}
