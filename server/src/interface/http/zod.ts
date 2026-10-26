import { HttpException, PipeTransform } from "@nestjs/common";
import type { ZodTypeAny, z } from "zod";
import type { Result } from "../../domain/shared/result";

export class ValidationFailed extends HttpException {
  constructor(message: string, readonly fields: Record<string, string>, status = 400) {
    super({ message, fields }, status);
  }
}

export function fieldsOf(error: z.ZodError): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_";
    fields[key] ??= issue.message;
  }
  return fields;
}

/** Validates request input at the edge so use cases only ever see well-formed data. */
export class ZodPipe<S extends ZodTypeAny> implements PipeTransform<unknown, z.infer<S>> {
  constructor(private readonly schema: S) {}
  transform(value: unknown): z.infer<S> {
    const parsed = this.schema.safeParse(value ?? {});
    if (!parsed.success) throw new ValidationFailed("Requête invalide.", fieldsOf(parsed.error));
    return parsed.data;
  }
}

/** Business-rule failures from the application layer become 422 with the same `{message, fields}` shape the front expects. */
export function unwrap<T>(result: Result<T>): T {
  if (result.ok) return result.value;
  throw new ValidationFailed(result.error, { ...(result.fields ?? {}) }, 422);
}
