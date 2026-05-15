import { Injectable } from "@nestjs/common";
import crypto from "node:crypto";

/**
 * AES-256-GCM envelope used for the Google refresh-tokens stored on
 * TutorProfile (FR-TH-17). GCM gives us authenticated encryption so a
 * tampered ciphertext fails decryption rather than silently producing
 * garbage we'd then try to use as a refresh token.
 *
 * Wire format (base64):
 *   [12-byte IV][ciphertext][16-byte auth tag]
 *
 * Key comes from GOOGLE_TOKEN_ENCRYPTION_KEY — a base64-encoded random
 * 32-byte value. Generate with:
 *   node -e "console.log(crypto.randomBytes(32).toString('base64'))"
 */
@Injectable()
export class CryptoService {
  private static readonly ALGORITHM = "aes-256-gcm";
  private static readonly IV_LENGTH = 12;
  private static readonly TAG_LENGTH = 16;

  private keyCache?: Buffer;

  encrypt(plaintext: string): string {
    const key = this.key();
    const iv = crypto.randomBytes(CryptoService.IV_LENGTH);
    const cipher = crypto.createCipheriv(CryptoService.ALGORITHM, key, iv);
    const ciphertext = Buffer.concat([
      cipher.update(plaintext, "utf8"),
      cipher.final(),
    ]);
    const tag = cipher.getAuthTag();
    return Buffer.concat([iv, ciphertext, tag]).toString("base64");
  }

  decrypt(blob: string): string {
    const key = this.key();
    const buf = Buffer.from(blob, "base64");
    if (buf.length < CryptoService.IV_LENGTH + CryptoService.TAG_LENGTH) {
      throw new Error("Ciphertext too short — corrupted or wrong format");
    }
    const iv = buf.subarray(0, CryptoService.IV_LENGTH);
    const tag = buf.subarray(buf.length - CryptoService.TAG_LENGTH);
    const ciphertext = buf.subarray(
      CryptoService.IV_LENGTH,
      buf.length - CryptoService.TAG_LENGTH,
    );
    const decipher = crypto.createDecipheriv(CryptoService.ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]).toString("utf8");
  }

  private key(): Buffer {
    if (this.keyCache) return this.keyCache;
    const raw = process.env.GOOGLE_TOKEN_ENCRYPTION_KEY;
    if (!raw) {
      throw new Error(
        "GOOGLE_TOKEN_ENCRYPTION_KEY is not set — required to encrypt/decrypt tutor refresh tokens. Generate with: node -e \"console.log(crypto.randomBytes(32).toString('base64'))\"",
      );
    }
    const key = Buffer.from(raw, "base64");
    if (key.length !== 32) {
      throw new Error(
        `GOOGLE_TOKEN_ENCRYPTION_KEY must decode to 32 bytes; got ${key.length}`,
      );
    }
    this.keyCache = key;
    return key;
  }
}
