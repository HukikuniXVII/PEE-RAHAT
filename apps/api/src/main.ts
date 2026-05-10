import "reflect-metadata";

// Load .env from apps/api before any module reads process.env.
// (Node 20.12+ exposes loadEnvFile; throws if file missing — guarded.)
try {
  process.loadEnvFile?.();
} catch {
  /* .env optional in production where vars come from the platform */
}

import { ValidationPipe, type INestApplication } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { SwaggerModule } from "@nestjs/swagger";

import { AppModule } from "./app.module";
import { buildOpenApiConfig } from "./openapi.config";

async function bootstrap() {
  const app: INestApplication = await NestFactory.create(AppModule);

  app.setGlobalPrefix("api");
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.enableCors({
    origin: process.env.WEB_ORIGIN ?? "http://localhost:3000",
    credentials: true,
  });

  const document = SwaggerModule.createDocument(app, buildOpenApiConfig());
  SwaggerModule.setup("api/docs", app, document);

  const port = Number(process.env.PORT ?? 3001);
  await app.listen(port, "0.0.0.0");
  // eslint-disable-next-line no-console
  console.log(`Pee Rahat API listening on http://0.0.0.0:${port}/api`);
}

void bootstrap();
