import { beforeEach, describe, expect, it, vi } from "vitest";
import { processRenderJob } from "./job-service";

const dbMocks = vi.hoisted(() => ({
  findOwnedAssets: vi.fn(),
  findWorkerJobById: vi.fn(),
  markJobCompleted: vi.fn(),
  markJobFailed: vi.fn(),
  markJobQueuedForRetry: vi.fn(),
  markJobRendering: vi.fn()
}));

const coreMocks = vi.hoisted(() => ({
  getEnv: vi.fn(),
  getPublicObjectUrl: vi.fn(),
  logError: vi.fn(),
  logInfo: vi.fn(),
  uploadObject: vi.fn()
}));

const rendererMocks = vi.hoisted(() => ({
  renderMarkdownToPdf: vi.fn()
}));

vi.mock("@md2pdf/db", () => dbMocks);
vi.mock("@md2pdf/core", () => coreMocks);
vi.mock("@md2pdf/renderer/pdf", () => rendererMocks);

describe("processRenderJob", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    coreMocks.getEnv.mockReturnValue({
      RENDER_TIMEOUT_MS: 30_000,
      JOB_MAX_ATTEMPTS: 3
    });
    coreMocks.getPublicObjectUrl.mockReturnValue("https://assets.local/a.png");
    coreMocks.uploadObject.mockResolvedValue(undefined);
    dbMocks.findWorkerJobById.mockResolvedValue({
      id: "job_123",
      ownerId: "user_123",
      status: "queued",
      filename: "document.pdf",
      markdown: "# Hello",
      assetIds: ["asset_1"],
      resultKey: null
    });
    dbMocks.findOwnedAssets.mockResolvedValue([{ id: "asset_1", storageKey: "assets/a.png" }]);
    dbMocks.markJobRendering.mockResolvedValue(undefined);
    dbMocks.markJobCompleted.mockResolvedValue(undefined);
    dbMocks.markJobFailed.mockResolvedValue(undefined);
    dbMocks.markJobQueuedForRetry.mockResolvedValue(undefined);
  });

  it("requeues transient failures when attempts remain", async () => {
    rendererMocks.renderMarkdownToPdf.mockRejectedValueOnce(new Error("Browser crashed"));

    await expect(
      processRenderJob({
        data: { jobId: "job_123" },
        attemptsMade: 0,
        opts: { attempts: 3 }
      } as never)
    ).rejects.toThrow("Browser crashed");

    expect(dbMocks.markJobQueuedForRetry).toHaveBeenCalledWith({
      id: "job_123",
      errorCode: "render_failed",
      errorMessage: "Browser crashed"
    });
    expect(dbMocks.markJobFailed).not.toHaveBeenCalled();
  });

  it("marks validation failures as terminal without retry", async () => {
    rendererMocks.renderMarkdownToPdf.mockRejectedValueOnce(
      new Error('Image asset "asset_1" is not available for this render.')
    );

    await processRenderJob({
      data: { jobId: "job_123" },
      attemptsMade: 0,
      opts: { attempts: 3 }
    } as never);

    expect(dbMocks.markJobFailed).toHaveBeenCalledWith({
      id: "job_123",
      status: "validation_failed",
      errorCode: "validation_failed",
      errorMessage: 'Image asset "asset_1" is not available for this render.'
    });
    expect(dbMocks.markJobQueuedForRetry).not.toHaveBeenCalled();
  });
});
