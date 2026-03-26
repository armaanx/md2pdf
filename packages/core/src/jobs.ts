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

export function createRedisConnection() {
  const env = getEnv();

  return new IORedis(env.REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false
  });
}

export function createRenderQueue() {
  const connection = createRedisConnection();
  const defaultJobOptions: JobsOptions = {
    attempts: 1,
    removeOnComplete: 100,
    removeOnFail: 100
  };

  return new Queue<RenderJobPayload>(RENDER_QUEUE_NAME, {
    connection,
    defaultJobOptions
  });
}

