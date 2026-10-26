import type { Result } from "@/domain/shared/result";

export interface FormState {
  readonly status: "idle" | "success" | "error";
  readonly message?: string;
  readonly fields?: Readonly<Record<string, string>>;
}

export const IDLE: FormState = { status: "idle" };

export function stateFromResult<T>(result: Result<T>, successMessage: string): FormState {
  return result.ok
    ? { status: "success", message: successMessage }
    : { status: "error", message: result.error, fields: result.fields };
}

export const text = (data: FormData, key: string): string => {
  const value = data.get(key);
  return typeof value === "string" ? value : "";
};

export const optionalNumber = (data: FormData, key: string): number | undefined => {
  const raw = text(data, key).replace(/\s/g, "");
  if (raw === "") return undefined;
  const value = Number(raw);
  return Number.isFinite(value) && value >= 0 ? value : undefined;
};
