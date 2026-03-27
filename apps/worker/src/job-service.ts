import type { Job } from "bullmq";
import type { JobStatus } from "@md2pdf/db";
import type { RenderThemeConfig } from "@md2pdf/renderer/theme";
import {
  findOwnedAssets,
  findWorkerJobById,
  markJobCompleted,
  markJobFailed,
  markJobQueuedForRetry,
  markJobRendering
} from "@md2pdf/db";
import { getEnv, getPublicObjectUrl, logError, logInfo, uploadObject } from "@md2pdf/core";
import { renderMarkdownToPdf } from "@md2pdf/renderer/pdf";

type RenderQueueJob = Job<{
  jobId: string;
  options?: {
    title?: string;
    timeoutMs?: number;
    theme?: RenderThemeConfig;
  };
}>;

type ErrorPayload = {
  status: JobStatus;
  code: string;
  message: string;
  retryable: boolean;
};

function toErrorPayload(error: unknown): ErrorPayload {
  const message = error instanceof Error ? error.message : "Rendering failed.";
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes("timeout")) {
    return {
      status: "timeout",
      code: "render_timeout",
      message,
      retryable: false
    };
  }

  if (
    message.includes("Raw HTML") ||
    message.includes("asset") ||
    message.includes("Markdown validation")
  ) {
    return {
      status: "validation_failed",
      code: "validation_failed",
      message,
      retryable: false
    };
  }

  return {
    status: "failed",
    code: "render_failed",
    message,
    retryable: true
  };
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number) {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Render timed out after ${timeoutMs}ms.`)), timeoutMs);

    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

export async function processRenderJob(queueJob: RenderQueueJob) {
  const env = getEnv();
  const job = await findWorkerJobById(queueJob.data.jobId);

  if (!job) {
    return;
  }

  await markJobRendering(job.id);
  logInfo("Worker started render", {
    jobId: job.id,
    ownerId: job.ownerId,
    attempt: queueJob.attemptsMade + 1
  });

  try {
    const assets = await findOwnedAssets(job.ownerId, job.assetIds);
    const pdf = await withTimeout(
      renderMarkdownToPdf({
        markdown: job.markdown,
        assets: assets.map((asset) => ({
          id: asset.id,
          url: getPublicObjectUrl(asset.storageKey)
        })),
        options: {
          ...queueJob.data.options,
          title: queueJob.data.options?.title ?? job.filename,
          timeoutMs: queueJob.data.options?.timeoutMs ?? env.RENDER_TIMEOUT_MS
        }
      }),
      env.RENDER_TIMEOUT_MS
    );

    const resultKey = `jobs/${job.ownerId}/${job.id}/${job.filename}`;
    await uploadObject({
      key: resultKey,
      body: pdf,
      contentType: "application/pdf"
    });

    await markJobCompleted({
      id: job.id,
      resultKey,
      resultSize: pdf.byteLength
    });

    logInfo("Worker completed render", {
      jobId: job.id,
      ownerId: job.ownerId,
      resultKey
    });
  } catch (error) {
    const mapped = toErrorPayload(error);
    const maxAttempts = typeof queueJob.opts.attempts === "number" ? queueJob.opts.attempts : env.JOB_MAX_ATTEMPTS;
    const remainingAttempts = maxAttempts - queueJob.attemptsMade - 1;

    if (mapped.retryable && remainingAttempts > 0) {
      await markJobQueuedForRetry({
        id: job.id,
        errorCode: mapped.code,
        errorMessage: mapped.message
      });

      logError("Worker render failed, retrying", {
        jobId: job.id,
        ownerId: job.ownerId,
        remainingAttempts,
        errorCode: mapped.code,
        error: mapped.message
      });

      throw error instanceof Error ? error : new Error(mapped.message);
    }

    await markJobFailed({
      id: job.id,
      status: mapped.status,
      errorCode: mapped.code,
      errorMessage: mapped.message
    });

    logError("Worker render failed", {
      jobId: job.id,
      ownerId: job.ownerId,
      status: mapped.status,
      errorCode: mapped.code,
      error: mapped.message
    });
  }
}
