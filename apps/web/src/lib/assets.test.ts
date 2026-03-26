import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const dbMocks = vi.hoisted(() => ({
  createAssetRecord: vi.fn(),
  deleteAssetRecordById: vi.fn(),
  findOwnedAssets: vi.fn()
}));

const coreMocks = vi.hoisted(() => ({
  deleteObject: vi.fn(),
  getAssetExpiration: vi.fn(),
  getEnv: vi.fn(),
  getPublicObjectUrl: vi.fn(),
  logError: vi.fn(),
  logInfo: vi.fn(),
  uploadObject: vi.fn()
}));

vi.mock("@md2pdf/db", () => dbMocks);
vi.mock("@md2pdf/core", () => coreMocks);

const { createUserAsset } = await import("./assets");

describe("createUserAsset", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    coreMocks.getEnv.mockReturnValue({
      MAX_ASSET_BYTES: 5_242_880
    });
    coreMocks.getAssetExpiration.mockReturnValue(new Date("2026-03-27T00:00:00.000Z"));
    coreMocks.uploadObject.mockResolvedValue(undefined);
    coreMocks.deleteObject.mockResolvedValue(undefined);
    dbMocks.createAssetRecord.mockResolvedValue({
      id: "asset_123",
      originalName: "diagram.png",
      contentType: "image/png",
      sizeBytes: 4
    });
  });

  it("cleans up uploaded objects when the DB write fails", async () => {
    dbMocks.createAssetRecord.mockRejectedValueOnce(new Error("DB unavailable"));
    const file = new File([new Uint8Array([1, 2, 3, 4])], "diagram.png", {
      type: "image/png"
    });

    await expect(createUserAsset({ ownerId: "user_123", file })).rejects.toThrow("DB unavailable");

    expect(coreMocks.uploadObject).toHaveBeenCalledTimes(1);
    expect(coreMocks.deleteObject).toHaveBeenCalledTimes(1);
  });
});
