import {
  CopyObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Injectable, Logger } from "@nestjs/common";

export interface SignedUploadUrl {
  uploadUrl: string;
  objectKey: string;
  expiresAt: string;
}

export interface SignedDownloadUrl {
  url: string;
  expiresAt: string;
}

interface S3Config {
  endpoint?: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  kycBucket: string;
  kycArchiveBucket?: string;
  sheetsBucket: string;
}

const SIGNED_URL_TTL_SECONDS = 5 * 60;

/**
 * S3-compatible storage abstraction. Works against AWS S3, Cloudflare R2,
 * and MinIO via the same SDK. KYC and sheet PDFs live in private buckets
 * (NFR-03 — encryption at rest, signed-URL access only).
 *
 * If the S3_* env vars aren't fully set in dev, falls back to the legacy
 * `https://storage.local/...` placeholder URLs so localhost flows still
 * work without bucket setup. Production fails loud at boot.
 */
@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly client: S3Client | null;
  private readonly config: S3Config | null;

  constructor() {
    this.config = this.loadConfig();
    if (this.config) {
      this.client = new S3Client({
        region: this.config.region,
        endpoint: this.config.endpoint || undefined,
        credentials: {
          accessKeyId: this.config.accessKeyId,
          secretAccessKey: this.config.secretAccessKey,
        },
        // R2 + MinIO require path-style addressing; AWS S3 accepts it too.
        forcePathStyle: !!this.config.endpoint,
      });
    } else {
      this.client = null;
      if (process.env.NODE_ENV === "production") {
        throw new Error(
          "S3 storage env not configured (S3_REGION, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, S3_BUCKET_KYC, S3_BUCKET_SHEETS required in production)",
        );
      }
      this.logger.warn(
        "S3 env not configured — StorageService is using stubbed URLs. Set S3_* env vars to enable real signing.",
      );
    }
  }

  /**
   * FR-TH-02 / NFR-03 — KYC bucket has private ACL; only signed PUTs may
   * write here, only signed GETs may read.
   */
  signKycUpload(
    userId: string,
    field: string,
    contentType: string,
  ): Promise<SignedUploadUrl> {
    const objectKey = `kyc/${userId}/${field}-${Date.now()}`;
    return this.signPut(this.config?.kycBucket, objectKey, contentType);
  }

  /**
   * FR-SM-01 — sheet PDFs land in the sheets bucket (private). Preview
   * images share the bucket but their key prefix lets a future CDN serve
   * them publicly without changing this contract.
   */
  signSheetUpload(
    userId: string,
    kind: "pdf" | "preview",
    contentType: string,
  ): Promise<SignedUploadUrl> {
    const objectKey = `sheets/${userId}/${kind}-${Date.now()}`;
    return this.signPut(this.config?.sheetsBucket, objectKey, contentType);
  }

  /**
   * NFR-03 cold archive: copy a KYC object out of the primary bucket into
   * the long-term archive bucket and delete the original. Idempotent —
   * CopyObject overwrites at the destination and DeleteObject is a no-op
   * if the source has already been removed.
   *
   * Dev (no S3 config) is a no-op so the archive cron can still run on
   * localhost without an S3 backend. Production with a configured
   * StorageService but no S3_BUCKET_KYC_ARCHIVE fails loud — silently
   * skipping would violate the retention requirement.
   */
  async archiveKycObject(objectKey: string): Promise<void> {
    if (!this.client || !this.config) {
      this.logger.warn(
        `archiveKycObject(${objectKey}): no S3 config — skipping (dev mode)`,
      );
      return;
    }
    if (!this.config.kycArchiveBucket) {
      throw new Error(
        "S3_BUCKET_KYC_ARCHIVE is not configured — cannot satisfy NFR-03 cold archive.",
      );
    }
    await this.client.send(
      new CopyObjectCommand({
        Bucket: this.config.kycArchiveBucket,
        Key: objectKey,
        CopySource: `${this.config.kycBucket}/${objectKey}`,
      }),
    );
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.config.kycBucket,
        Key: objectKey,
      }),
    );
  }

  /**
   * Caller (sheets.service.issueDownload, kyc admin tools) is responsible
   * for the entitlement check before invoking this. Bucket is inferred
   * from the key prefix — keep `kyc/` and `sheets/` as the only namespaces.
   */
  async signDownload(objectKey: string): Promise<SignedDownloadUrl> {
    const expiresAt = new Date(
      Date.now() + SIGNED_URL_TTL_SECONDS * 1000,
    ).toISOString();
    if (!this.client || !this.config) {
      return {
        url: `https://storage.local/download/${objectKey}`,
        expiresAt,
      };
    }
    const bucket = objectKey.startsWith("kyc/")
      ? this.config.kycBucket
      : this.config.sheetsBucket;
    const url = await getSignedUrl(
      this.client,
      new GetObjectCommand({ Bucket: bucket, Key: objectKey }),
      { expiresIn: SIGNED_URL_TTL_SECONDS },
    );
    return { url, expiresAt };
  }

  private async signPut(
    bucket: string | undefined,
    objectKey: string,
    contentType: string,
  ): Promise<SignedUploadUrl> {
    const expiresAt = new Date(
      Date.now() + SIGNED_URL_TTL_SECONDS * 1000,
    ).toISOString();
    if (!this.client || !bucket) {
      return {
        uploadUrl: `https://storage.local/upload/${objectKey}?contentType=${encodeURIComponent(contentType)}`,
        objectKey,
        expiresAt,
      };
    }
    const uploadUrl = await getSignedUrl(
      this.client,
      new PutObjectCommand({
        Bucket: bucket,
        Key: objectKey,
        ContentType: contentType,
      }),
      { expiresIn: SIGNED_URL_TTL_SECONDS },
    );
    return { uploadUrl, objectKey, expiresAt };
  }

  private loadConfig(): S3Config | null {
    const region = process.env.S3_REGION;
    const accessKeyId = process.env.S3_ACCESS_KEY_ID;
    const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
    const kycBucket = process.env.S3_BUCKET_KYC;
    const sheetsBucket = process.env.S3_BUCKET_SHEETS;
    if (!region || !accessKeyId || !secretAccessKey || !kycBucket || !sheetsBucket) {
      return null;
    }
    return {
      endpoint: process.env.S3_ENDPOINT,
      region,
      accessKeyId,
      secretAccessKey,
      kycBucket,
      kycArchiveBucket: process.env.S3_BUCKET_KYC_ARCHIVE,
      sheetsBucket,
    };
  }
}
