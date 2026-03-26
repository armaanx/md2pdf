import "server-only";

import path from "node:path";
import { prisma } from "@md2pdf/db";
import { getEnv, getPublicObjectUrl, uploadObject } from "@md2pdf/core";
import type { RenderAsset } from "@md2pdf/renderer";

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

  if (sizeBytes > env.MAX_ASSET_BYTES) {
    throw new Error(`Asset exceeds ${env.MAX_ASSET_BYTES} bytes.`);
  }

  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24);
  const asset = await prisma.asset.create({
    data: {
      ownerId: input.ownerId,
      contentType: input.file.type || "application/octet-stream",
      originalName: input.file.name,
      sizeBytes,
      expiresAt,
      storageKey: `assets/${input.ownerId}/${Date.now()}-${sanitizeFilename(input.file.name)}`
    }
  });

  await uploadObject({
    key: asset.storageKey,
    body: Buffer.from(arrayBuffer),
    contentType: asset.contentType
  });

  return {
    id: asset.id,
    name: asset.originalName,
    markdownUrl: `asset://${asset.id}`,
    contentType: asset.contentType,
    sizeBytes: asset.sizeBytes
  };
}

export async function getOwnedAssets(ownerId: string, assetIds: string[]) {
  if (!assetIds.length) {
    return [];
  }

  return prisma.asset.findMany({
    where: {
      ownerId,
      id: { in: assetIds }
    }
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

