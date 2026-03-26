import { Queue, type JobsOptions } from "bullmq";
import IORedis from "ioredis";
import { z } from "zod";
import { getEnv } from "./env";

export const RENDER_QUEUE_NAME = "render-markdown-pdf";

export const jobStatusSchema = z.enum([
  "queued",
  "rendering",
  "completed",
  "failed",
  "validation_failed",
  "timeout"
]);

export type JobStatus = z.infer<typeof jobStatusSchema>;

export const renderJobPayloadSchema = z.object({
  jobId: z.string().min(1)
});

export type RenderJobPayload = z.infer<typeof renderJobPayloadSchema>;

let sharedQueue: Queue<RenderJobPayload> | null = null;

export function createRedisConnection() {
  const env = getEnv();

  return new IORedis(env.REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false
  });
}

function createDefaultJobOptions(): JobsOptions {
  const env = getEnv();

  const defaultJobOptions: JobsOptions = {
    attempts: env.JOB_MAX_ATTEMPTS,
    backoff: {
      type: "fixed",
      delay: env.JOB_BACKOFF_MS
    },
    removeOnComplete: 100,
    removeOnFail: 100
  };

  return defaultJobOptions;
}

export function getRenderQueue() {
  if (sharedQueue) {
    return sharedQueue;
  }

  const connection = createRedisConnection();

  sharedQueue = new Queue<RenderJobPayload>(RENDER_QUEUE_NAME, {
    connection,
    defaultJobOptions: createDefaultJobOptions()
  });

  return sharedQueue;
}

export async function enqueueRenderJob(payload: RenderJobPayload) {
  const queue = getRenderQueue();
  return queue.add("render", payload, { jobId: payload.jobId });
}

export async function closeRenderQueue() {
  if (!sharedQueue) {
    return;
  }

  await sharedQueue.close();
  sharedQueue = null;
}

export async function checkRedisHealth() {
  const connection = createRedisConnection();

  try {
    await connection.ping();
  } finally {
    await connection.quit();
  }
}

export function getWorkerConcurrency() {
  return getEnv().WORKER_CONCURRENCY;
}

export function getJobRetentionCutoff(now = new Date()) {
  const retentionMs = getEnv().JOB_TTL_HOURS * 60 * 60 * 1000;
  return new Date(now.getTime() - retentionMs);
}

export function getAssetExpiration(now = new Date()) {
  const assetTtlMs = getEnv().ASSET_TTL_HOURS * 60 * 60 * 1000;
  return new Date(now.getTime() + assetTtlMs);
}

export function getStaleRenderingCutoff(now = new Date()) {
  const env = getEnv();
  const cutoffMs = Math.max(env.RENDER_TIMEOUT_MS * 2, 5 * 60 * 1000);
  return new Date(now.getTime() - cutoffMs);
}

export function getCleanupIntervalMs() {
  return 15 * 60 * 1000;
}

export function createRenderQueueForWorker() {
  const connection = createRedisConnection();

  return new Queue<RenderJobPayload>(RENDER_QUEUE_NAME, {
    connection,
    defaultJobOptions: createDefaultJobOptions()
  });
}
