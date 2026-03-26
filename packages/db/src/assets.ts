import type { Asset } from "../generated/client/index";
import { prisma } from "./client";

export type OwnedAsset = Pick<
  Asset,
  "id" | "ownerId" | "storageKey" | "originalName" | "contentType" | "sizeBytes" | "createdAt" | "expiresAt"
>;

export async function createAssetRecord(input: {
  ownerId: string;
  storageKey: string;
  originalName: string;
  contentType: string;
  sizeBytes: number;
  expiresAt: Date;
}) {
  return prisma.asset.create({
    data: input,
    select: {
      id: true,
      ownerId: true,
      storageKey: true,
      originalName: true,
      contentType: true,
      sizeBytes: true,
      createdAt: true,
      expiresAt: true
    }
  });
}

export async function deleteAssetRecordById(id: string) {
  return prisma.asset.delete({
    where: { id }
  });
}

export async function findOwnedAssets(ownerId: string, assetIds: string[]): Promise<OwnedAsset[]> {
  if (!assetIds.length) {
    return [];
  }

  return prisma.asset.findMany({
    where: {
      ownerId,
      id: { in: assetIds }
    },
    select: {
      id: true,
      ownerId: true,
      storageKey: true,
      originalName: true,
      contentType: true,
      sizeBytes: true,
      createdAt: true,
      expiresAt: true
    }
  });
}

export async function listExpiredAssets(now: Date) {
  return prisma.asset.findMany({
    where: {
      expiresAt: {
        lt: now
      }
    },
    select: {
      id: true,
      storageKey: true
    }
  });
}

export async function deleteAssetRecordsByIds(ids: string[]) {
  if (!ids.length) {
    return;
  }

  await prisma.asset.deleteMany({
    where: {
      id: {
        in: ids
      }
    }
  });
}
