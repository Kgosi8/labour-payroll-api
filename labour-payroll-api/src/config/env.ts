import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),
  MONGODB_URI: z.string().min(1),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('8h'),
  FIELD_ENCRYPTION_KEY: z.string().regex(/^[0-9a-fA-F]{64}$/, 'FIELD_ENCRYPTION_KEY must be 64 hex chars (32 bytes)'),
  BUSINESS_UTC_OFFSET_MINUTES: z.coerce.number().default(120),
  CORS_ORIGINS: z.string().default(''),
  STORAGE_DRIVER: z.enum(['local', 's3']).default('local'),
  UPLOAD_DIR: z.string().default('./uploads'),
  S3_BUCKET: z.string().optional(),
  S3_REGION: z.string().default('af-south-1'),
  S3_ENDPOINT: z.string().optional(), // e.g. Cloudflare R2 / MinIO
}).refine((e) => e.STORAGE_DRIVER !== 's3' || !!e.S3_BUCKET, {
  message: 'S3_BUCKET is required when STORAGE_DRIVER=s3',
  path: ['S3_BUCKET'],
});

export const env = schema.parse(process.env);