import type { FormState } from "./form-state";

export type ToastKind = "success" | "error" | "info";

export interface ToastItem {
  readonly id: number;
  readonly kind: ToastKind;
  readonly title: string;
  readonly details: readonly string[];
  readonly durationMs: number;
}

type Listener = () => void;

/** Tiny client-side store (no dependency). Call `toast.success(...)` / `toast.error(...)` from any client code. */
let items: readonly ToastItem[] = [];
let nextId = 1;
const listeners = new Set<Listener>();
const MAX_VISIBLE = 4;

const emit = () => listeners.forEach((listener) => listener());

function push(kind: ToastKind, title: string, details: readonly string[] = []) {
  const last = items[items.length - 1];
  // Same message twice in a row (double click, dev strict mode) is shown once.
  if (last && last.kind === kind && last.title === title && last.details.join() === details.join()) return last.id;
  const id = nextId++;
  const durationMs = kind === "error" ? 8000 : 4500;
  items = [...items, { id, kind, title, details, durationMs }].slice(-MAX_VISIBLE);
  emit();
  return id;
}

export const toast = {
  success: (title: string, details?: readonly string[]) => push("success", title, details),
  error: (title: string, details?: readonly string[]) => push("error", title, details),
  info: (title: string, details?: readonly string[]) => push("info", title, details),
  dismiss(id: number) {
    items = items.filter((item) => item.id !== id);
    emit();
  },
};

export const toastStore = {
  subscribe(listener: Listener) {
    listeners.add(listener);
    return () => void listeners.delete(listener);
  },
  getSnapshot: () => items,
  getServerSnapshot: (): readonly ToastItem[] => [],
};

const MAX_DETAILS = 4;

/** Turns a server-action result into a toast: the exact message, plus the per-field problems when there are any. */
export function announce(state: FormState | undefined | void): void {
  if (!state || state.status === "idle" || !state.message) return;
  if (state.status === "success") {
    toast.success(state.message);
    return;
  }
  const details = Object.values(state.fields ?? {}).slice(0, MAX_DETAILS);
  toast.error(state.message, details);
}
