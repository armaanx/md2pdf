import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const dbMocks = vi.hoisted(() => ({
  countActiveJobsForUser: vi.fn(),
  createJobRecord: vi.fn(),
  findJobStatusForUser: vi.fn(),
  markJobQueuePublishFailed: vi.fn()
}));

const coreMocks = vi.hoisted(() => ({
  enqueueRenderJob: vi.fn(),
  getDownloadUrl: vi.fn(),
  getEnv: vi.fn(),
  logError: vi.fn(),
  logInfo: vi.fn()
}));

const rendererMocks = vi.hoisted(() => ({
  validateMarkdown: vi.fn()
}));

const assetMocks = vi.hoisted(() => ({
  derivePdfFilename: vi.fn(),
  getOwnedAssets: vi.fn(),
  toRenderAssets: vi.fn()
}));

vi.mock("@md2pdf/db", () => dbMocks);
vi.mock("@md2pdf/core", () => coreMocks);
vi.mock("@md2pdf/renderer/html", () => rendererMocks);
vi.mock("./assets", () => assetMocks);

const { createRenderJob } = await import("./jobs");

describe("createRenderJob", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbMocks.countActiveJobsForUser.mockResolvedValue(0);
    dbMocks.createJobRecord.mockResolvedValue({
      id: "job_123",
      status: "queued",
      filename: "document.pdf",
      createdAt: new Date("2026-03-26T00:00:00.000Z")
    });
    dbMocks.markJobQueuePublishFailed.mockResolvedValue(undefined);
    coreMocks.enqueueRenderJob.mockResolvedValue(undefined);
    coreMocks.getEnv.mockReturnValue({
      MAX_CONCURRENT_JOBS_PER_USER: 3,
      MAX_MARKDOWN_BYTES: 262_144
    });
    rendererMocks.validateMarkdown.mockReturnValue({
      ok: true,
      issues: []
    });
    assetMocks.derivePdfFilename.mockReturnValue("document.pdf");
    assetMocks.getOwnedAssets.mockResolvedValue([{ id: "asset_1", storageKey: "assets/a.png" }]);
    assetMocks.toRenderAssets.mockReturnValue([{ id: "asset_1", url: "https://assets.local/a.png" }]);
  });

  it("validates markdown and enqueues without rendering html on the request path", async () => {
    const result = await createRenderJob({
      ownerId: "user_123",
      markdown: "# Test",
      assetIds: ["asset_1"],
      filename: "document"
    });

    expect(result.ok).toBe(true);
    expect(rendererMocks.validateMarkdown).toHaveBeenCalledWith({
      markdown: "# Test",
      assets: [{ id: "asset_1", url: "https://assets.local/a.png" }]
    });
    expect(coreMocks.enqueueRenderJob).toHaveBeenCalledWith({ jobId: "job_123" });
  });

  it("marks the job as failed when queue publication fails", async () => {
    coreMocks.enqueueRenderJob.mockRejectedValueOnce(new Error("Redis unavailable"));

    await expect(
      createRenderJob({
        ownerId: "user_123",
        markdown: "# Test",
        assetIds: ["asset_1"],
        filename: "document"
      })
    ).rejects.toThrow("Redis unavailable");

    expect(dbMocks.markJobQueuePublishFailed).toHaveBeenCalledWith({
      id: "job_123",
      errorCode: "queue_publish_failed",
      errorMessage: "Redis unavailable"
    });
  });
});
