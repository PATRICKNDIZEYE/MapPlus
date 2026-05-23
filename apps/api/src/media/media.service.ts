import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { join, extname } from 'path';
import { writeFile, unlink, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { randomUUID } from 'crypto';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const ALLOWED_MIME = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_BYTES = 4 * 1024 * 1024; // 4 MB hard limit (client compresses to ~800 KB first)

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);
  private readonly isDev: boolean;
  private readonly uploadsDir: string;
  private s3: S3Client | null = null;

  constructor(private config: ConfigService) {
    this.isDev    = config.get<string>('nodeEnv') !== 'production';
    this.uploadsDir = join(process.cwd(), 'uploads');

    if (!this.isDev) {
      this.s3 = new S3Client({
        region:   config.get<string>('storage.region') ?? 'auto',
        endpoint: config.get<string>('storage.endpoint'),
        credentials: {
          accessKeyId:     config.get<string>('storage.accessKey')!,
          secretAccessKey: config.get<string>('storage.secretKey')!,
        },
        forcePathStyle: true, // required for MinIO
      });
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

    if (this.isDev) {
      return this.saveToFilesystem(buffer, filename);
    }
    return this.saveToS3(buffer, filename, mimeType);
  }

  /** Delete a previously saved file by its URL. Silently ignores missing files. */
  async deleteFile(url: string | null): Promise<void> {
    if (!url) return;
    try {
      if (this.isDev) {
        const filename = url.split('/uploads/')[1];
        if (filename) await unlink(join(this.uploadsDir, filename));
      } else {
        const key = url.split('/').pop();
        if (!key || !this.s3) return;
        await this.s3.send(new DeleteObjectCommand({
          Bucket: this.config.get('storage.bucket'),
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
    const apiUrl = this.config.get<string>('storage.endpoint') ?? 'http://localhost:3001';
    // In dev the API serves /uploads/* via ServeStaticModule
    return `http://localhost:3001/uploads/${filename}`;
  }

  private async saveToS3(buffer: Buffer, filename: string, mimeType: string): Promise<string> {
    const bucket = this.config.get<string>('storage.bucket')!;
    await this.s3!.send(new PutObjectCommand({
      Bucket:      bucket,
      Key:         filename,
      Body:        buffer,
      ContentType: mimeType,
      ACL:         'public-read' as any,
    }));
    const cdn = this.config.get<string>('cdn.url');
    return `${cdn}/${filename}`;
  }
}
