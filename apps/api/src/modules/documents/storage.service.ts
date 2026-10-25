import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
  S3ServiceException,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Injectable, type OnModuleDestroy } from "@nestjs/common";
import { env } from "../../env.js";

const UPLOAD_URL_TTL = 10 * 60;
const DOWNLOAD_URL_TTL = 5 * 60;

@Injectable()
export class StorageService implements OnModuleDestroy {
  private readonly bucket = env.AWS_S3_BUCKET;
  private readonly s3 = new S3Client({
    region: env.AWS_REGION,
    endpoint: env.S3_ENDPOINT,
    forcePathStyle: !!env.S3_ENDPOINT,
    credentials: { accessKeyId: env.AWS_ACCESS_KEY_ID, secretAccessKey: env.AWS_SECRET_ACCESS_KEY },
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  });

  uploadUrl(key: string, mimeType: string, size: number) {
    const command = new PutObjectCommand({ Bucket: this.bucket, Key: key, ContentType: mimeType, ContentLength: size });
    return getSignedUrl(this.s3, command, {
      expiresIn: UPLOAD_URL_TTL,
      signableHeaders: new Set(["content-type", "content-length"]),
    });
  }

  downloadUrl(key: string, fileName: string, mimeType: string) {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ResponseContentType: mimeType,
      ResponseContentDisposition: `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
    });
    return getSignedUrl(this.s3, command, { expiresIn: DOWNLOAD_URL_TTL });
  }

  async head(key: string) {
    try {
      const res = await this.s3.send(new HeadObjectCommand({ Bucket: this.bucket, Key: key }));
      return { size: res.ContentLength, mimeType: res.ContentType };
    } catch (err) {
      if (err instanceof S3ServiceException && err.$metadata.httpStatusCode === 404) return null;
      throw err;
    }
  }

  async remove(key: string) {
    await this.s3.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }

  onModuleDestroy() {
    this.s3.destroy();
  }
}
