import { disconnectDatabase, checkDatabaseHealth } from "@md2pdf/db";
import { checkRedisHealth, logError, logInfo } from "@md2pdf/core";
import { closeRendererBrowser, ensureRendererBrowser } from "@md2pdf/renderer/pdf";

async function main() {
  try {
    await Promise.all([checkDatabaseHealth(), checkRedisHealth(), ensureRendererBrowser()]);
    logInfo("Worker healthcheck passed");
  } catch (error) {
    logError("Worker healthcheck failed", {
      error: error instanceof Error ? error.message : "Unknown healthcheck error"
    });
    process.exitCode = 1;
  } finally {
    await closeRendererBrowser().catch(() => undefined);
    await disconnectDatabase().catch(() => undefined);
  }
}

void main();
