import { Worker } from "bullmq";
import { disconnectDatabase } from "@md2pdf/db";
import {
  RENDER_QUEUE_NAME,
  createRedisConnection,
  getWorkerConcurrency,
  logError,
  logInfo
} from "@md2pdf/core";
import { closeRendererBrowser } from "@md2pdf/renderer/pdf";
import { runMaintenanceSweep, startMaintenanceScheduler } from "./cleanup";
import { processRenderJob } from "./job-service";

const connection = createRedisConnection();

const worker = new Worker(RENDER_QUEUE_NAME, processRenderJob, {
  connection,
  concurrency: getWorkerConcurrency()
});

worker.on("ready", () => {
  logInfo("md2pdf worker ready", {
    concurrency: getWorkerConcurrency()
  });
});

worker.on("error", (error) => {
  logError("Worker error", {
    error: error instanceof Error ? error.message : "Unknown worker error"
  });
});

const stopMaintenance = startMaintenanceScheduler();

void runMaintenanceSweep().catch((error) => {
  logError("Initial worker maintenance sweep failed", {
    error: error instanceof Error ? error.message : "Unknown maintenance error"
  });
});

async function shutdown(signal: string) {
  logInfo("Received worker shutdown signal", { signal });
  stopMaintenance();
  await worker.close();
  await closeRendererBrowser();
  await disconnectDatabase();
  await connection.quit();
  process.exit(0);
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
