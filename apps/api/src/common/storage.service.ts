import { Injectable } from "@nestjs/common";

export interface SignedUploadUrl {
  uploadUrl: string;
  objectKey: string;
  expiresAt: string;
}

@Injectable()
export class StorageService {
  /**
   * Issue a presigned PUT URL on the KYC bucket (private ACL, AES-256, NFR-03).
   * TODO: replace stub with real R2/S3 SDK integration.
   */
  async signKycUpload(
    userId: string,
    field: string,
    contentType: string,
  ): Promise<SignedUploadUrl> {
    const objectKey = `kyc/${userId}/${field}-${Date.now()}`;
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
    // TODO: integrate with @aws-sdk/client-s3 or Cloudflare R2 SDK
    return {
      uploadUrl: `https://storage.local/upload/${objectKey}?contentType=${encodeURIComponent(contentType)}`,
      objectKey,
      expiresAt,
    };
  }

  /**
   * Issue a short-lived signed download URL after entitlement check.
   */
  async signDownload(objectKey: string): Promise<{ url: string; expiresAt: string }> {
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
    return {
      url: `https://storage.local/download/${objectKey}`,
      expiresAt,
    };
  }
}
