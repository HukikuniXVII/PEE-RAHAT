import "reflect-metadata";

// Load .env from apps/api before any module reads process.env.
// (Node 20.12+ exposes loadEnvFile; throws if file missing — guarded.)
try {
  process.loadEnvFile?.();
} catch {
  /* .env optional in production where vars come from the platform */
}

import { Logger, type INestApplication } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { SwaggerModule } from "@nestjs/swagger";

import { AllExceptionsFilter } from "./common/all-exceptions.filter";
import { AppModule } from "./app.module";
import { buildOpenApiConfig } from "./openapi.config";

async function bootstrap() {
  const app: INestApplication = await NestFactory.create(AppModule);

  app.setGlobalPrefix("api");
  app.useGlobalFilters(new AllExceptionsFilter());
  // Every controller now validates via Zod schemas from @peerahat/types and
  // ZodError flows through AllExceptionsFilter — Nest's ValidationPipe is
  // not needed and class-validator / class-transformer are no longer deps.
  app.enableCors({
    origin: process.env.WEB_ORIGIN ?? "http://localhost:3000",
    credentials: true,
  });
  app.enableShutdownHooks();

  const document = SwaggerModule.createDocument(app, buildOpenApiConfig());
  SwaggerModule.setup("api/docs", app, document);

  const port = Number(process.env.PORT ?? 3001);
  await app.listen(port, "0.0.0.0");
  new Logger("Bootstrap").log(
    `Pee Rahat API listening on http://0.0.0.0:${port}/api`,
  );
}

void bootstrap();
