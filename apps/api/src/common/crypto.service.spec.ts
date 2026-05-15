import crypto from "node:crypto";

import { CryptoService } from "./crypto.service";

describe("CryptoService", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    process.env.GOOGLE_TOKEN_ENCRYPTION_KEY = crypto
      .randomBytes(32)
      .toString("base64");
  });
  afterAll(() => {
    process.env = originalEnv;
  });

  it("round-trips ascii", () => {
    const svc = new CryptoService();
    const blob = svc.encrypt("1//abcDEF12345_secret");
    expect(svc.decrypt(blob)).toBe("1//abcDEF12345_secret");
  });

  it("round-trips Thai + emoji", () => {
    const svc = new CryptoService();
    const plain = "พี่นัทเชื่อม Google แล้ว 🎉";
    expect(svc.decrypt(svc.encrypt(plain))).toBe(plain);
  });

  it("non-deterministic — same plaintext encrypts to different blobs (random IV)", () => {
    const svc = new CryptoService();
    const a = svc.encrypt("same");
    const b = svc.encrypt("same");
    expect(a).not.toBe(b);
    expect(svc.decrypt(a)).toBe("same");
    expect(svc.decrypt(b)).toBe("same");
  });

  it("rejects tampered ciphertext (GCM auth tag mismatch)", () => {
    const svc = new CryptoService();
    const blob = svc.encrypt("payload");
    const tampered = Buffer.from(blob, "base64");
    // Flip a byte in the ciphertext region (after IV, before tag).
    tampered[15]! ^= 0xff;
    const corruptBlob = tampered.toString("base64");
    expect(() => svc.decrypt(corruptBlob)).toThrow();
  });

  it("rejects blob too short", () => {
    const svc = new CryptoService();
    expect(() => svc.decrypt(Buffer.from("short").toString("base64"))).toThrow(
      /Ciphertext too short/,
    );
  });

  it("rejects when key is wrong length", () => {
    process.env.GOOGLE_TOKEN_ENCRYPTION_KEY = Buffer.from("only-16-bytes-here")
      .toString("base64");
    const svc = new CryptoService();
    expect(() => svc.encrypt("x")).toThrow(/must decode to 32 bytes/);
  });

  it("throws clear error when env unset", () => {
    delete process.env.GOOGLE_TOKEN_ENCRYPTION_KEY;
    const svc = new CryptoService();
    expect(() => svc.encrypt("x")).toThrow(
      /GOOGLE_TOKEN_ENCRYPTION_KEY is not set/,
    );
  });
});
