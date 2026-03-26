import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),
  S3_ENDPOINT: z.string().url(),
  S3_REGION: z.string().min(1),
  S3_ACCESS_KEY_ID: z.string().min(1),
  S3_SECRET_ACCESS_KEY: z.string().min(1),
  S3_BUCKET: z.string().min(1),
  S3_PUBLIC_BASE_URL: z.string().url(),
  AUTH_COOKIE_SECRET: z.string().min(16),
  APP_URL: z.string().url(),
  RENDER_TIMEOUT_MS: z.coerce.number().int().positive().default(30_000),
  MAX_MARKDOWN_BYTES: z.coerce.number().int().positive().default(262_144),
  MAX_ASSET_BYTES: z.coerce.number().int().positive().default(5_242_880),
  MAX_ASSET_COUNT: z.coerce.number().int().positive().default(12),
  MAX_CONCURRENT_JOBS_PER_USER: z.coerce.number().int().positive().default(3),
  WORKER_CONCURRENCY: z.coerce.number().int().positive().default(2),
  JOB_MAX_ATTEMPTS: z.coerce.number().int().positive().default(3),
  JOB_BACKOFF_MS: z.coerce.number().int().positive().default(2_000),
  ASSET_TTL_HOURS: z.coerce.number().int().positive().default(24),
  JOB_TTL_HOURS: z.coerce.number().int().positive().default(24)
});

export type AppEnv = z.infer<typeof envSchema>;

let cachedEnv: AppEnv | null = null;

export function getEnv(): AppEnv {
  if (cachedEnv) {
    return cachedEnv;
  }

  cachedEnv = envSchema.parse(process.env);
  return cachedEnv;
}
