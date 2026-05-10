import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { NestFactory } from "@nestjs/core";
import { SwaggerModule } from "@nestjs/swagger";

import { AppModule } from "../app.module";
import { buildOpenApiConfig } from "../openapi.config";

async function main() {
  const app = await NestFactory.create(AppModule, { logger: false });
  app.setGlobalPrefix("api");
  const document = SwaggerModule.createDocument(app, buildOpenApiConfig());
  const outPath = resolve(__dirname, "..", "..", "..", "openapi.json");
  writeFileSync(outPath, JSON.stringify(document, null, 2));
  await app.close();
  // eslint-disable-next-line no-console
  console.log(`Wrote ${outPath} (${Object.keys(document.paths).length} paths)`);
}

void main();
