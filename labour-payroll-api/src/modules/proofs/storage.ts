import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import type { Readable } from "node:stream";
import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { env } from "../../config/env";

export interface FileStorage {
  put(key: string, data: Buffer, contentType: string): Promise<void>;
  getStream(key: string): Promise<Readable>;
}

class LocalStorage implements FileStorage {
  private base = path.resolve(env.UPLOAD_DIR);

  private resolve(key: string) {
    const full = path.resolve(this.base, key);
    if (!full.startsWith(this.base + path.sep))
      throw new Error("Invalid storage key");
    return full;
  }
  async put(key: string, data: Buffer) {
    const full = this.resolve(key);
    await fsp.mkdir(path.dirname(full), { recursive: true });
    await fsp.writeFile(full, data, { mode: 0o600 });
  }
  async getStream(key: string) {
    return fs.createReadStream(this.resolve(key));
  }
}

class S3Storage implements FileStorage {
  private client = new S3Client({
    region: env.S3_REGION,
    ...(env.S3_ENDPOINT
      ? { endpoint: env.S3_ENDPOINT, forcePathStyle: true }
      : {}),
  });
  async put(key: string, data: Buffer, contentType: string) {
    await this.client.send(
      new PutObjectCommand({
        Bucket: env.S3_BUCKET,
        Key: key,
        Body: data,
        ContentType: contentType,
      }),
    );
  }
  async getStream(key: string) {
    const out = await this.client.send(
      new GetObjectCommand({ Bucket: env.S3_BUCKET, Key: key }),
    );
    return out.Body as Readable;
  }
}

export const storage: FileStorage =
  env.STORAGE_DRIVER === "s3" ? new S3Storage() : new LocalStorage();
