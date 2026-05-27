/**
 * Smoke test for the FR-PM-01 slip upload + admin preview round-trip.
 * Exercises StorageService end-to-end against the local MinIO:
 *   1. signSlipUpload  → signed PUT URL
 *   2. fetch PUT       → object lands in MinIO under slips/<intentId>/...
 *   3. signDownload    → signed GET URL routed back to the sheets bucket
 *   4. fetch GET       → bytes round-trip identical to what we PUT
 *
 * Run after `docker compose up -d postgres redis minio minio-init`:
 *   pnpm --filter @peerahat/api exec tsx --env-file=.env scripts/smoke-slip-roundtrip.ts
 *
 * One-off scratch script; not exported from any module.
 */
import { StorageService } from "../src/common/storage.service";

async function main() {
  const storage = new StorageService();
  const intentId = `smoke-${Date.now()}`;
  const contentType = "image/png";
  // 1x1 transparent PNG, base64'd. Keeps the payload tiny and lets us
  // assert byte-for-byte equality after the round-trip.
  const payload = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4//8/AwAI/AL+XJ6JTAAAAABJRU5ErkJggg==",
    "base64",
  );

  console.log(`[1] signSlipUpload(${intentId}, ${contentType})`);
  const up = await storage.signSlipUpload(intentId, contentType);
  console.log(`    uploadUrl: ${up.uploadUrl.split("?")[0]}?...`);
  console.log(`    objectKey: ${up.objectKey}`);

  console.log(`[2] PUT ${payload.length} bytes`);
  const putRes = await fetch(up.uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body: payload,
  });
  if (!putRes.ok) {
    console.error(`    FAIL: ${putRes.status} ${putRes.statusText}`);
    process.exit(1);
  }
  console.log(`    PUT ok (${putRes.status})`);

  console.log(`[3] signDownload(${up.objectKey}) — legacy signed-URL path`);
  const dn = await storage.signDownload(up.objectKey);
  console.log(`    url: ${dn.url.split("?")[0]}?...`);

  console.log(`[4] GET signed download`);
  const getRes = await fetch(dn.url);
  if (!getRes.ok) {
    console.error(`    FAIL: ${getRes.status} ${getRes.statusText}`);
    process.exit(1);
  }
  const got = Buffer.from(await getRes.arrayBuffer());
  if (got.length !== payload.length || !got.equals(payload)) {
    console.error(
      `    FAIL: byte mismatch (got ${got.length}, want ${payload.length})`,
    );
    process.exit(1);
  }
  console.log(`    GET ok — ${got.length} bytes match`);

  console.log(`[5] fetchObject(${up.objectKey}) — proxy path (admin uses this)`);
  const fetched = await storage.fetchObject(up.objectKey);
  if (
    fetched.body.length !== payload.length ||
    !fetched.body.equals(payload)
  ) {
    console.error(
      `    FAIL: proxy byte mismatch (got ${fetched.body.length}, want ${payload.length})`,
    );
    process.exit(1);
  }
  if (fetched.contentType !== contentType) {
    console.error(
      `    FAIL: content-type mismatch (got "${fetched.contentType}", want "${contentType}")`,
    );
    process.exit(1);
  }
  console.log(
    `    fetchObject ok — ${fetched.body.length} bytes, contentType=${fetched.contentType}`,
  );
  console.log("");
  console.log("SUCCESS — slip upload + admin preview round-trip works.");
}

main().catch((e) => {
  console.error("UNCAUGHT:", e);
  process.exit(1);
});
