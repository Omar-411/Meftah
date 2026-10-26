import { Inject, Injectable, Logger, Module, OnApplicationShutdown, OnModuleInit } from "@nestjs/common";
import { APP_FILTER, APP_GUARD } from "@nestjs/core";
import { JwtModule } from "@nestjs/jwt";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import type { AlertGateway, Deps } from "./application/ports";
import { ENV, loadEnv, type Env } from "./config/env";
import { buildDeps } from "./infrastructure/composition";
import { MemoryDatabase } from "./infrastructure/persistence/memory-database";
import { MongoDatabase } from "./infrastructure/persistence/mongo-database";
import type { Database } from "./infrastructure/persistence/database";
import { CollectionAuthGateway } from "./infrastructure/persistence/repositories/auth";
import { bootstrapDatabase, ensureAdmin } from "./infrastructure/seed/seed-loader";
import { CloudApiAlertGateway, LogAlertGateway } from "./infrastructure/whatsapp/alert-gateways";
import { AuthController } from "./interface/http/auth/auth.controller";
import { CrmAppointmentsController } from "./interface/http/crm/appointments.controller";
import { CrmDealsController, CrmNotificationsController, CrmSettingsController } from "./interface/http/crm/deals-and-settings.controller";
import { CrmLeadsController } from "./interface/http/crm/leads.controller";
import { CrmListingsController } from "./interface/http/crm/listings.controller";
import { DomainExceptionFilter } from "./interface/http/filters/domain-exception.filter";
import { CrmTemplatesController } from "./interface/http/crm/templates.controller";
import { ReminderScheduler } from "./interface/scheduler/reminder-scheduler";
import { CrmTasksController } from "./interface/http/crm/tasks.controller";
import { CrmUsersController } from "./interface/http/crm/users.controller";
import { HealthController } from "./interface/http/health.controller";
import { MeController } from "./interface/http/me/me.controller";
import { AgentsController } from "./interface/http/public/agents.controller";
import { PublicController } from "./interface/http/public/public.controller";
import { SessionGuard } from "./interface/http/session";
import { ALERT_GATEWAY, AUTH_GATEWAY, DATABASE, DEPS } from "./interface/tokens";

/** Seeds an empty database once at startup and closes the connection on shutdown. */
@Injectable()
class DatabaseLifecycle implements OnModuleInit, OnApplicationShutdown {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    @Inject(AUTH_GATEWAY) private readonly auth: CollectionAuthGateway,
    @Inject(ENV) private readonly env: Env,
  ) {}

  async onModuleInit() {
    const admin = this.env.ADMIN_EMAIL && this.env.ADMIN_PASSWORD ? { email: this.env.ADMIN_EMAIL.toLowerCase(), password: this.env.ADMIN_PASSWORD, fullName: this.env.ADMIN_NAME } : undefined;
    const outcome = await bootstrapDatabase(this.db, this.auth, { demoData: this.env.SEED_DEMO_DATA, admin });
    const logger = new Logger("Bootstrap");
    if (outcome !== "skipped") logger.log(`Base initialisée (${outcome}).`);
    if (admin && (await ensureAdmin(this.db, this.auth, admin)) === "created") logger.log(`Compte administrateur créé : ${admin.email}`);
  }

  async onApplicationShutdown() {
    await this.db.close();
  }
}

@Module({
  imports: [
    JwtModule.registerAsync({
      global: true,
      inject: [ENV],
      useFactory: (env: Env) => ({ secret: env.JWT_SECRET, signOptions: { expiresIn: env.JWT_TTL_SECONDS } }),
      extraProviders: [{ provide: ENV, useFactory: () => loadEnv() }],
    }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 1_000 }]),
  ],
  controllers: [
    HealthController,
    AuthController,
    PublicController,
    AgentsController,
    MeController,
    CrmListingsController,
    CrmLeadsController,
    CrmAppointmentsController,
    CrmDealsController,
    CrmNotificationsController,
    CrmSettingsController,
    CrmUsersController,
    CrmTasksController,
    CrmTemplatesController,
  ],
  providers: [
    { provide: ENV, useFactory: () => loadEnv() },
    {
      provide: DATABASE,
      inject: [ENV],
      useFactory: async (env: Env): Promise<Database> =>
        env.DB_DRIVER === "mongo" ? MongoDatabase.connect(env.MONGODB_URI, env.MONGODB_DB) : new MemoryDatabase(),
    },
    { provide: AUTH_GATEWAY, inject: [DATABASE], useFactory: (db: Database) => new CollectionAuthGateway(db) },
    {
      provide: ALERT_GATEWAY,
      inject: [ENV],
      useFactory: (env: Env): AlertGateway => {
        const logger = new Logger("WhatsApp");
        return env.WHATSAPP_PHONE_NUMBER_ID && env.WHATSAPP_ACCESS_TOKEN
          ? new CloudApiAlertGateway({ phoneNumberId: env.WHATSAPP_PHONE_NUMBER_ID, accessToken: env.WHATSAPP_ACCESS_TOKEN }, logger)
          : new LogAlertGateway(logger);
      },
    },
    {
      provide: DEPS,
      inject: [DATABASE, AUTH_GATEWAY, ALERT_GATEWAY],
      useFactory: (db: Database, auth: CollectionAuthGateway, alerts: AlertGateway): Deps => buildDeps(db, auth, alerts),
    },
    DatabaseLifecycle,
    ReminderScheduler,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: SessionGuard },
    { provide: APP_FILTER, useClass: DomainExceptionFilter },
  ],
})
export class AppModule {}
