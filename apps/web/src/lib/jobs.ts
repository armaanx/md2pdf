import "server-only";

import {
  countActiveJobsForUser,
  createJobRecord,
  findJobStatusForUser,
  markJobQueuePublishFailed
} from "@md2pdf/db";
import { enqueueRenderJob, getEnv, logError, logInfo } from "@md2pdf/core";
import { validateMarkdown } from "@md2pdf/renderer/html";
import { derivePdfFilename, getOwnedAssets, toRenderAssets } from "./assets";

export async function ensureUserCanQueueJob(userId: string) {
  const env = getEnv();
  const activeCount = await countActiveJobsForUser(userId);

  if (activeCount >= env.MAX_CONCURRENT_JOBS_PER_USER) {
    throw new Error("You have reached the concurrent render limit.");
  }
}

export async function validateRenderRequest(input: {
  ownerId: string;
  markdown: string;
  assetIds: string[];
}) {
  const env = getEnv();

  if (Buffer.byteLength(input.markdown, "utf8") > env.MAX_MARKDOWN_BYTES) {
    throw new Error(`Markdown exceeds ${env.MAX_MARKDOWN_BYTES} bytes.`);
  }

  const assets = await getOwnedAssets(input.ownerId, input.assetIds);

  if (assets.length !== input.assetIds.length) {
    throw new Error("One or more assets do not belong to the current user.");
  }

  const renderAssets = toRenderAssets(assets);
  const validation = validateMarkdown({
    markdown: input.markdown,
    assets: renderAssets
  });

  return {
    validation,
    renderAssets
  };
}

export async function createRenderJob(input: {
  ownerId: string;
  markdown: string;
  assetIds: string[];
  filename?: string;
}) {
  await ensureUserCanQueueJob(input.ownerId);
  const { validation } = await validateRenderRequest(input);

  if (!validation.ok) {
    return {
      ok: false as const,
      issues: validation.issues
    };
  }

  const job = await createJobRecord({
    ownerId: input.ownerId,
    markdown: input.markdown,
    assetIds: input.assetIds,
    filename: derivePdfFilename(input.filename)
  });

  try {
    await enqueueRenderJob({ jobId: job.id });
  } catch (error) {
    await markJobQueuePublishFailed({
      id: job.id,
      errorCode: "queue_publish_failed",
      errorMessage: error instanceof Error ? error.message : "Failed to publish render job."
    });

    logError("Render job enqueue failed", {
      ownerId: input.ownerId,
      jobId: job.id,
      error: error instanceof Error ? error.message : "Unknown queue error"
    });

    throw error;
  }

  logInfo("Render job queued", {
    ownerId: input.ownerId,
    jobId: job.id
  });

  return {
    ok: true as const,
    job
  };
}

export async function getJobStatusForUser(userId: string, jobId: string) {
  const job = await findJobStatusForUser(userId, jobId);

  if (!job) {
    return null;
  }

  return {
    id: job.id,
    status: job.status,
    errorCode: job.errorCode,
    errorMessage: job.errorMessage,
    filename: job.filename,
    createdAt: job.createdAt.toISOString(),
    completedAt: job.completedAt?.toISOString() ?? null,
    downloadUrl: job.resultKey ? `/api/jobs/${job.id}/download` : null
  };
}
