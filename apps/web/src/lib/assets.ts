import "server-only";

import path from "node:path";
import {
  createAssetRecord,
  deleteAssetRecordById,
  findOwnedAssets as findOwnedAssetRecords
} from "@md2pdf/db";
import {
  deleteObject,
  getAssetExpiration,
  getEnv,
  getPublicObjectUrl,
  logError,
  logInfo,
  uploadObject
} from "@md2pdf/core";
import type { RenderAsset } from "@md2pdf/renderer/html";

function sanitizeFilename(filename: string) {
  return filename.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-");
}

export async function createUserAsset(input: {
  ownerId: string;
  file: File;
}) {
  const env = getEnv();
  const arrayBuffer = await input.file.arrayBuffer();
  const sizeBytes = arrayBuffer.byteLength;
  const contentType = input.file.type || "application/octet-stream";

  if (sizeBytes > env.MAX_ASSET_BYTES) {
    throw new Error(`Asset exceeds ${env.MAX_ASSET_BYTES} bytes.`);
  }

  const storageKey = `assets/${input.ownerId}/${Date.now()}-${sanitizeFilename(input.file.name)}`;
  const expiresAt = getAssetExpiration();

  await uploadObject({
    key: storageKey,
    body: Buffer.from(arrayBuffer),
    contentType
  });

  try {
    const asset = await createAssetRecord({
      ownerId: input.ownerId,
      storageKey,
      originalName: input.file.name,
      contentType,
      sizeBytes,
      expiresAt
    });

    logInfo("Asset created", {
      ownerId: input.ownerId,
      assetId: asset.id,
      storageKey: asset.storageKey
    });

    return {
      id: asset.id,
      name: asset.originalName,
      markdownUrl: `asset://${asset.id}`,
      contentType: asset.contentType,
      sizeBytes: asset.sizeBytes
    };
  } catch (error) {
    await deleteObject(storageKey).catch((cleanupError) => {
      logError("Asset cleanup after DB failure failed", {
        ownerId: input.ownerId,
        storageKey,
        error: cleanupError instanceof Error ? cleanupError.message : "Unknown cleanup error"
      });
    });

    throw error;
  }
}

export async function getOwnedAssets(ownerId: string, assetIds: string[]) {
  if (!assetIds.length) {
    return [];
  }

  return findOwnedAssetRecords(ownerId, assetIds);
}

export async function deleteAssetForFailedPersistence(id: string, storageKey: string, ownerId: string) {
  await deleteAssetRecordById(id).catch((error) => {
    logError("Asset record cleanup failed", {
      ownerId,
      assetId: id,
      storageKey,
      error: error instanceof Error ? error.message : "Unknown cleanup error"
    });
  });
}

export function toRenderAssets(
  assets: Array<{ id: string; storageKey: string }>
): RenderAsset[] {
  return assets.map((asset) => ({
    id: asset.id,
    url: getPublicObjectUrl(asset.storageKey)
  }));
}

export function derivePdfFilename(raw?: string) {
  const safeBase = sanitizeFilename(raw?.trim() || "document.pdf");
  const ext = path.extname(safeBase).toLowerCase();

  if (ext === ".pdf") {
    return safeBase;
  }

  if (!ext) {
    return `${safeBase}.pdf`;
  }

  return `${safeBase.slice(0, -ext.length)}.pdf`;
}
