import { z } from "zod";

const bool = z.enum(["true", "false"]).transform((value) => value === "true");

const schema = z.object({
  PORT: z.coerce.number().int().positive().default(4000),
  CORS_ORIGINS: z.string().default("http://localhost:3000"),
  DB_DRIVER: z.enum(["memory", "mongo"]).default("memory"),
  MONGODB_URI: z.string().default("mongodb://localhost:27017"),
  MONGODB_DB: z.string().default("darcrm"),
  JWT_SECRET: z.string().min(16, "JWT_SECRET doit contenir au moins 16 caractères."),
  JWT_TTL_SECONDS: z.coerce.number().int().positive().default(60 * 60 * 12),
  SEED_DEMO_DATA: bool.default("true"),
  ADMIN_EMAIL: z.string().email().optional(),
  ADMIN_PASSWORD: z.string().min(8).optional(),
  ADMIN_NAME: z.string().default("Administrateur"),
  WHATSAPP_PHONE_NUMBER_ID: z.string().optional(),
  WHATSAPP_ACCESS_TOKEN: z.string().optional(),
  REMINDERS_ENABLED: bool.default("true"),
  PUBLIC_SITE_URL: z.string().default("http://localhost:3000"),
});

export type Env = Readonly<z.infer<typeof schema>> & { readonly corsOrigins: readonly string[] };

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const parsed = schema.safeParse(source);
  if (!parsed.success) {
    const details = parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ");
    throw new Error(`Configuration invalide : ${details}`);
  }
  const env = parsed.data;
  return { ...env, corsOrigins: env.CORS_ORIGINS.split(",").map((origin) => origin.trim()).filter(Boolean) };
}

export const ENV = Symbol("ENV");
