import "server-only";

import { prisma } from "@md2pdf/db";
import { createRenderQueue, getDownloadUrl, getEnv } from "@md2pdf/core";
import { renderMarkdownToHtml } from "@md2pdf/renderer";
import { derivePdfFilename, getOwnedAssets, toRenderAssets } from "./assets";

export async function ensureUserCanQueueJob(userId: string) {
  const env = getEnv();
  const activeCount = await prisma.job.count({
    where: {
      ownerId: userId,
      status: {
        in: ["queued", "rendering"]
      }
    }
  });

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
  const preview = await renderMarkdownToHtml({
    markdown: input.markdown,
    assets: renderAssets,
    options: { timeoutMs: env.RENDER_TIMEOUT_MS }
  });

  return {
    validation: preview.validation,
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

  const job = await prisma.job.create({
    data: {
      ownerId: input.ownerId,
      markdown: input.markdown,
      assetIds: input.assetIds,
      filename: derivePdfFilename(input.filename),
      status: "queued"
    }
  });

  const queue = createRenderQueue();
  await queue.add("render", { jobId: job.id });
  await queue.close();

  return {
    ok: true as const,
    job
  };
}

export async function getJobStatusForUser(userId: string, jobId: string) {
  const job = await prisma.job.findFirst({
    where: {
      id: jobId,
      ownerId: userId
    }
  });

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
    downloadUrl: job.resultKey ? await getDownloadUrl(job.resultKey) : null
  };
}

