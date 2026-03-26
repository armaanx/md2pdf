import {
  deleteAssetRecordsByIds,
  deleteJobRecordsByIds,
  listExpiredAssets,
  listExpiredJobs,
  recoverStaleRenderingJobs
} from "@md2pdf/db";
import {
  deleteObject,
  getCleanupIntervalMs,
  getJobRetentionCutoff,
  getStaleRenderingCutoff,
  logError,
  logInfo
} from "@md2pdf/core";

export async function runMaintenanceSweep() {
  const now = new Date();
  const expiredAssets = await listExpiredAssets(now);

  for (const asset of expiredAssets) {
    await deleteObject(asset.storageKey).catch((error) => {
      logError("Expired asset object cleanup failed", {
        assetId: asset.id,
        storageKey: asset.storageKey,
        error: error instanceof Error ? error.message : "Unknown cleanup error"
      });
    });
  }

  await deleteAssetRecordsByIds(expiredAssets.map((asset) => asset.id));

  const expiredJobs = await listExpiredJobs(getJobRetentionCutoff(now));

  for (const job of expiredJobs) {
    if (!job.resultKey) {
      continue;
    }

    await deleteObject(job.resultKey).catch((error) => {
      logError("Expired job object cleanup failed", {
        jobId: job.id,
        resultKey: job.resultKey,
        error: error instanceof Error ? error.message : "Unknown cleanup error"
      });
    });
  }

  await deleteJobRecordsByIds(expiredJobs.map((job) => job.id));

  const recovered = await recoverStaleRenderingJobs(getStaleRenderingCutoff(now));

  if (expiredAssets.length || expiredJobs.length || recovered.count) {
    logInfo("Worker maintenance sweep completed", {
      expiredAssets: expiredAssets.length,
      expiredJobs: expiredJobs.length,
      recoveredJobs: recovered.count
    });
  }
}

export function startMaintenanceScheduler() {
  const timer = setInterval(() => {
    void runMaintenanceSweep().catch((error) => {
      logError("Worker maintenance sweep failed", {
        error: error instanceof Error ? error.message : "Unknown maintenance error"
      });
    });
  }, getCleanupIntervalMs());

  return () => clearInterval(timer);
}
