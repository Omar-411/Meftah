export type Result<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: string; readonly fields?: Readonly<Record<string, string>> };

export const ok = <T>(value: T): Result<T> => ({ ok: true, value });

export const fail = (error: string, fields?: Record<string, string>): Result<never> => ({
  ok: false,
  error,
  fields,
});

export interface Page<T> {
  readonly items: readonly T[];
  readonly total: number;
  readonly page: number;
  readonly pageSize: number;
}

export function pageCount(page: Pick<Page<unknown>, "total" | "pageSize">): number {
  return Math.max(1, Math.ceil(page.total / page.pageSize));
}
