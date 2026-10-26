import type { NestExpressApplication } from "@nestjs/platform-express";
import helmet from "helmet";
import type { Env } from "./config/env";

export const JSON_BODY_LIMIT = "12mb";

/** Shared by main.ts and the e2e tests so both run the same HTTP setup. */
export function configureApp(app: NestExpressApplication, env: Pick<Env, "corsOrigins">) {
  app.setGlobalPrefix("api");
  // Listing photos travel as data URLs inside the listing (the front downsizes them and caps the form at 10 MB).
  // Replace with a file-upload endpoint before photos become large or numerous.
  app.useBodyParser("json", { limit: JSON_BODY_LIMIT });
  app.use(helmet());
  app.enableCors({ origin: [...env.corsOrigins], credentials: true });
  app.enableShutdownHooks();
}
