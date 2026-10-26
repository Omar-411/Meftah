import { ForbiddenError, NotFoundError } from "@/application/errors";
import { fail, type Result } from "@/domain/shared/result";
import { ApiError } from "@/infrastructure/http/client";

/** Turns use-case errors into user-facing Results so actions never leak stack traces. */
export async function run<T>(operation: () => Promise<Result<T>>): Promise<Result<T>> {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof ForbiddenError || error instanceof NotFoundError) return fail(error.message);
    if (error instanceof ApiError) return fail(error.message, error.fields);
    console.error(error);
    return fail("Une erreur est survenue. Réessayez dans un instant.");
  }
}
