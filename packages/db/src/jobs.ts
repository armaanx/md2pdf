import type { Job, JobStatus } from "../generated/client/client";
import { prisma } from "./client";

export type UserJobSummary = Pick<
  Job,
  "id" | "status" | "filename" | "errorCode" | "errorMessage" | "resultKey" | "createdAt" | "completedAt"
>;

export type WorkerJob = Pick<
  Job,
  "id" | "ownerId" | "status" | "filename" | "markdown" | "assetIds" | "resultKey"
>;

export async function countActiveJobsForUser(ownerId: string) {
  return prisma.job.count({
    where: {
      ownerId,
      status: {
        in: ["queued", "rendering"]
      }
    }
  });
}

export async function createJobRecord(input: {
  ownerId: string;
  markdown: string;
  assetIds: string[];
  filename: string;
}) {
  return prisma.job.create({
    data: {
      ...input,
      status: "queued"
    },
    select: {
      id: true,
      status: true,
      filename: true,
      createdAt: true
    }
  });
}

export async function markJobQueuedForRetry(input: {
  id: string;
  errorCode: string;
  errorMessage: string;
}) {
  return prisma.job.update({
    where: { id: input.id },
    data: {
      status: "queued",
      errorCode: input.errorCode,
      errorMessage: input.errorMessage,
      startedAt: null
    }
  });
}

export async function markJobQueuePublishFailed(input: {
  id: string;
  errorCode: string;
  errorMessage: string;
}) {
  return prisma.job.update({
    where: { id: input.id },
    data: {
      status: "failed",
      errorCode: input.errorCode,
      errorMessage: input.errorMessage,
      completedAt: new Date()
    }
  });
}

export async function findWorkerJobById(id: string): Promise<WorkerJob | null> {
  return prisma.job.findUnique({
    where: { id },
    select: {
      id: true,
      ownerId: true,
      status: true,
      filename: true,
      markdown: true,
      assetIds: true,
      resultKey: true
    }
  });
}

export async function markJobRendering(id: string) {
  return prisma.job.update({
    where: { id },
    data: {
      status: "rendering",
      startedAt: new Date(),
      completedAt: null,
      errorCode: null,
      errorMessage: null
    }
  });
}

export async function markJobCompleted(input: {
  id: string;
  resultKey: string;
  resultSize: number;
}) {
  return prisma.job.update({
    where: { id: input.id },
    data: {
      status: "completed",
      completedAt: new Date(),
      resultKey: input.resultKey,
      resultSize: input.resultSize,
      errorCode: null,
      errorMessage: null
    }
  });
}

export async function markJobFailed(input: {
  id: string;
  status: JobStatus;
  errorCode: string;
  errorMessage: string;
}) {
  return prisma.job.update({
    where: { id: input.id },
    data: {
      status: input.status,
      completedAt: new Date(),
      errorCode: input.errorCode,
      errorMessage: input.errorMessage
    }
  });
}

export async function findCompletedJobForUser(ownerId: string, id: string) {
  return prisma.job.findFirst({
    where: {
      id,
      ownerId,
      status: "completed",
      resultKey: {
        not: null
      }
    },
    select: {
      id: true,
      filename: true,
      resultKey: true
    }
  });
}

export async function findJobStatusForUser(ownerId: string, id: string): Promise<UserJobSummary | null> {
  return prisma.job.findFirst({
    where: {
      id,
      ownerId
    },
    select: {
      id: true,
      status: true,
      filename: true,
      errorCode: true,
      errorMessage: true,
      resultKey: true,
      createdAt: true,
      completedAt: true
    }
  });
}

export async function listRecentJobsForUser(ownerId: string, take: number): Promise<UserJobSummary[]> {
  return prisma.job.findMany({
    where: { ownerId },
    orderBy: { createdAt: "desc" },
    take,
    select: {
      id: true,
      status: true,
      filename: true,
      errorCode: true,
      errorMessage: true,
      resultKey: true,
      createdAt: true,
      completedAt: true
    }
  });
}

export async function listExpiredJobs(cutoff: Date) {
  return prisma.job.findMany({
    where: {
      createdAt: {
        lt: cutoff
      },
      status: {
        in: ["completed", "failed", "validation_failed", "timeout"]
      }
    },
    select: {
      id: true,
      resultKey: true
    }
  });
}

export async function deleteJobRecordsByIds(ids: string[]) {
  if (!ids.length) {
    return;
  }

  await prisma.job.deleteMany({
    where: {
      id: {
        in: ids
      }
    }
  });
}

export async function recoverStaleRenderingJobs(cutoff: Date) {
  return prisma.job.updateMany({
    where: {
      status: "rendering",
      startedAt: {
        lt: cutoff
      }
    },
    data: {
      status: "failed",
      completedAt: new Date(),
      errorCode: "worker_stalled",
      errorMessage: "Previous worker attempt stalled before completion."
    }
  });
}
