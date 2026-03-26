import { Worker } from "bullmq";
import { prisma } from "@md2pdf/db";
import {
  RENDER_QUEUE_NAME,
  createRedisConnection,
  deleteObject,
  getEnv,
  getPublicObjectUrl,
  uploadObject
} from "@md2pdf/core";
import { closeRendererBrowser, renderMarkdownToPdf } from "@md2pdf/renderer";

function toErrorPayload(error: unknown) {
  const message = error instanceof Error ? error.message : "Rendering failed.";

  if (message.toLowerCase().includes("timeout")) {
    return {
      status: "timeout" as const,
      code: "render_timeout",
      message
    };
  }

  if (
    message.includes("Raw HTML") ||
    message.includes("asset") ||
    message.includes("Markdown validation")
  ) {
    return {
      status: "validation_failed" as const,
      code: "validation_failed",
      message
    };
  }

  return {
    status: "failed" as const,
    code: "render_failed",
    message
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

const env = getEnv();
const connection = createRedisConnection();

async function cleanupExpiredArtifacts() {
  const now = new Date();
  const cutoff = new Date(Date.now() - 1000 * 60 * 60 * 24);

  const expiredAssets = await prisma.asset.findMany({
    where: {
      expiresAt: {
        lt: now
      }
    }
  });

  for (const asset of expiredAssets) {
    await deleteObject(asset.storageKey).catch(() => undefined);
  }

  if (expiredAssets.length) {
    await prisma.asset.deleteMany({
      where: {
        id: {
          in: expiredAssets.map((asset) => asset.id)
        }
      }
    });
  }

  const expiredJobs = await prisma.job.findMany({
    where: {
      createdAt: {
        lt: cutoff
      },
      status: {
        in: ["completed", "failed", "validation_failed", "timeout"]
      }
    }
  });

  for (const job of expiredJobs) {
    if (job.resultKey) {
      await deleteObject(job.resultKey).catch(() => undefined);
    }
  }

  if (expiredJobs.length) {
    await prisma.job.deleteMany({
      where: {
        id: {
          in: expiredJobs.map((job) => job.id)
        }
      }
    });
  }
}

const worker = new Worker(
  RENDER_QUEUE_NAME,
  async (queueJob) => {
    const job = await prisma.job.findUnique({
      where: { id: queueJob.data.jobId }
    });

    if (!job) {
      return;
    }

    await prisma.job.update({
      where: { id: job.id },
      data: {
        status: "rendering",
        startedAt: new Date(),
        errorCode: null,
        errorMessage: null
      }
    });

    try {
      const assets = await prisma.asset.findMany({
        where: {
          ownerId: job.ownerId,
          id: { in: job.assetIds }
        }
      });

      const pdf = await withTimeout(
        renderMarkdownToPdf({
          markdown: job.markdown,
          assets: assets.map((asset) => ({
            id: asset.id,
            url: getPublicObjectUrl(asset.storageKey)
          })),
          options: {
            title: job.filename,
            timeoutMs: env.RENDER_TIMEOUT_MS
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

      await prisma.job.update({
        where: { id: job.id },
        data: {
          status: "completed",
          completedAt: new Date(),
          resultKey,
          resultSize: pdf.byteLength
        }
      });
    } catch (error) {
      const mapped = toErrorPayload(error);

      await prisma.job.update({
        where: { id: job.id },
        data: {
          status: mapped.status,
          completedAt: new Date(),
          errorCode: mapped.code,
          errorMessage: mapped.message
        }
      });
    }
  },
  {
    connection,
    concurrency: 2
  }
);

worker.on("ready", () => {
  console.log("md2pdf worker ready");
});

worker.on("error", (error) => {
  console.error("Worker error", error);
});

const cleanupTimer = setInterval(() => {
  void cleanupExpiredArtifacts().catch((error) => {
    console.error("Cleanup error", error);
  });
}, 1000 * 60 * 15);

void cleanupExpiredArtifacts().catch((error) => {
  console.error("Initial cleanup error", error);
});

async function shutdown(signal: string) {
  console.log(`Received ${signal}. Shutting down worker.`);
  clearInterval(cleanupTimer);
  await worker.close();
  await closeRendererBrowser();
  await prisma.$disconnect();
  await connection.quit();
  process.exit(0);
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
