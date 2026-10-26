import "dotenv/config";
import { Logger } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { AppModule } from "./app.module";
import { configureApp } from "./configure-app";
import { loadEnv } from "./config/env";

async function bootstrap() {
  const env = loadEnv();
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  configureApp(app, env);
  await app.listen(env.PORT);
  new Logger("Bootstrap").log(`API prête sur http://localhost:${env.PORT}/api (base : ${env.DB_DRIVER})`);
}

void bootstrap();
