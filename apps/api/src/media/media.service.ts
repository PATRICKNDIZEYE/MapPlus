import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { join } from 'path';
import { writeFile, unlink, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { randomUUID } from 'crypto';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';

const ALLOWED_MIME = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_BYTES = 4 * 1024 * 1024; // 4 MB hard limit (client compresses to ~800 KB first)

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);
  private readonly uploadsDir: string;
  private readonly apiPublicUrl: string;
  private s3: S3Client | null = null;
  private s3Bucket: string | null = null;
  private cdnUrl: string | null   = null;

  constructor(private config: ConfigService) {
    this.uploadsDir   = join(process.cwd(), 'uploads');
    this.apiPublicUrl = config.get<string>('apiPublicUrl') ?? 'http://localhost:3001';

    // Only initialise S3 when BOTH endpoint and access keys are configured —
    // not based on NODE_ENV. This lets a production deploy without S3
    // credentials gracefully fall back to local filesystem storage instead
    // of crashing on every upload attempt.
    const endpoint  = config.get<string>('storage.endpoint');
    const accessKey = config.get<string>('storage.accessKey');
    const secretKey = config.get<string>('storage.secretKey');
    const bucket    = config.get<string>('storage.bucket');
    if (endpoint && accessKey && secretKey && bucket) {
      this.s3 = new S3Client({
        region:   config.get<string>('storage.region') ?? 'auto',
        endpoint,
        credentials: { accessKeyId: accessKey, secretAccessKey: secretKey },
        forcePathStyle: true, // required for MinIO + Cloudflare R2
      });
      this.s3Bucket = bucket;
      this.cdnUrl   = config.get<string>('cdn.url') ?? null;
      this.logger.log(`Media: S3-compatible storage configured (${endpoint})`);
    } else {
      this.logger.log('Media: S3 credentials not set — using local filesystem');
    }
  }

  /** Save a base64-encoded image. Returns the public URL. */
  async saveFile(base64: string, mimeType: string, prefix = 'photo'): Promise<string> {
    if (!ALLOWED_MIME.includes(mimeType)) {
      throw new BadRequestException(`Unsupported image type: ${mimeType}`);
    }

    const buffer = Buffer.from(base64, 'base64');
    if (buffer.byteLength > MAX_BYTES) {
      throw new BadRequestException('Image exceeds 4 MB limit. Please compress before uploading.');
    }

    const ext      = mimeType.split('/')[1]!.replace('jpeg', 'jpg');
    const filename = `${prefix}-${randomUUID()}.${ext}`;

    if (this.s3 && this.s3Bucket) {
      return this.saveToS3(buffer, filename, mimeType);
    }
    return this.saveToFilesystem(buffer, filename);
  }

  /** Delete a previously saved file by its URL. Silently ignores missing files. */
  async deleteFile(url: string | null): Promise<void> {
    if (!url) return;
    try {
      if (url.includes('/uploads/')) {
        const filename = url.split('/uploads/')[1];
        if (filename) await unlink(join(this.uploadsDir, filename));
      } else if (this.s3 && this.s3Bucket) {
        const key = url.split('/').pop();
        if (!key) return;
        await this.s3.send(new DeleteObjectCommand({
          Bucket: this.s3Bucket,
          Key:    key,
        }));
      }
    } catch (err) {
      this.logger.warn(`Could not delete file ${url}: ${(err as Error).message}`);
    }
  }

  // ── Private helpers ─────────────────────────────────────────────────────────

  private async saveToFilesystem(buffer: Buffer, filename: string): Promise<string> {
    if (!existsSync(this.uploadsDir)) {
      await mkdir(this.uploadsDir, { recursive: true });
    }
    await writeFile(join(this.uploadsDir, filename), buffer);
    // URL must be reachable from the browser — use the configured public API URL.
    return `${this.apiPublicUrl.replace(/\/$/, '')}/uploads/${filename}`;
  }

  private async saveToS3(buffer: Buffer, filename: string, mimeType: string): Promise<string> {
    await this.s3!.send(new PutObjectCommand({
      Bucket:      this.s3Bucket!,
      Key:         filename,
      Body:        buffer,
      ContentType: mimeType,
      ACL:         'public-read' as 'public-read',
    }));
    return this.cdnUrl ? `${this.cdnUrl}/${filename}` : `${this.s3Bucket}/${filename}`;
  }
}
