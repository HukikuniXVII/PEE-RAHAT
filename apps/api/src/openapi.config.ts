import { DocumentBuilder } from "@nestjs/swagger";

export function buildOpenApiConfig() {
  return new DocumentBuilder()
    .setTitle("Pee Rahat API")
    .setDescription("Phase 1 backend for the Pee Rahat tutoring marketplace.")
    .setVersion("0.1.0")
    .addBearerAuth({ type: "http", scheme: "bearer", bearerFormat: "JWT" })
    .build();
}
