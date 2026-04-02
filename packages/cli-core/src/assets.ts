import { copyFile, mkdir, readFile, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { lookup as lookupMimeType } from "mime-types";
import type { RenderAsset, RenderImageSourceResolver } from "@md2pdf/renderer/html";
import { ensureWorkspace, saveWorkspaceConfig } from "./config";
import type { ResolvedLocalAsset, WorkspaceAssetRecord, WorkspaceContext } from "./types";

function sanitizeSegment(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
}

function createAssetId(baseName: string, existingIds: Set<string>) {
  const baseId = sanitizeSegment(path.parse(baseName).name).toLowerCase() || "asset";
  let nextId = baseId;
  let counter = 2;

  while (existingIds.has(nextId)) {
    nextId = `${baseId}-${counter}`;
    counter += 1;
  }

  return nextId;
}

function toFileUrlPath(rawUrl: string) {
  if (!rawUrl.startsWith("file:")) {
    return null;
  }

  return fileURLToPath(rawUrl);
}

function isAbsoluteFsPath(rawUrl: string) {
  return path.isAbsolute(rawUrl) || /^[A-Za-z]:[\\/]/.test(rawUrl);
}

async function fileToDataUrl(absolutePath: string) {
  const bytes = await readFile(absolutePath);
  const contentType = lookupMimeType(absolutePath) || "application/octet-stream";
  return `data:${contentType};base64,${bytes.toString("base64")}`;
}

export function getWorkspaceAssetPath(workspace: WorkspaceContext, asset: WorkspaceAssetRecord) {
  return path.join(workspace.assetsDir, asset.fileName);
}

export async function importWorkspaceAssets(startDir: string, filePaths: string[]) {
  const workspace = await ensureWorkspace(startDir);
  await mkdir(workspace.assetsDir, { recursive: true });

  const existingIds = new Set(workspace.config.assets.map((asset) => asset.id));
  const nextAssets = [...workspace.config.assets];
  const imported: Array<WorkspaceAssetRecord & { absolutePath: string; markdownUrl: string }> = [];

  for (const inputPath of filePaths) {
    const absoluteSource = path.resolve(startDir, inputPath);
    const fileStats = await stat(absoluteSource);
    const originalName = path.basename(absoluteSource);
    const assetId = createAssetId(originalName, existingIds);
    const safeFileName = `${assetId}-${sanitizeSegment(originalName) || originalName}`;
    const destinationPath = path.join(workspace.assetsDir, safeFileName);
    const assetRecord: WorkspaceAssetRecord = {
      id: assetId,
      fileName: safeFileName,
      originalName,
      importedAt: new Date().toISOString(),
      sizeBytes: fileStats.size
    };

    await copyFile(absoluteSource, destinationPath);
    existingIds.add(assetId);
    nextAssets.unshift(assetRecord);
    imported.push({
      ...assetRecord,
      absolutePath: destinationPath,
      markdownUrl: `asset://${assetRecord.id}`
    });
  }

  const savedWorkspace = await saveWorkspaceConfig(workspace, {
    ...workspace.config,
    assets: nextAssets
  });

  return {
    workspace: savedWorkspace,
    imported
  };
}

export async function buildWorkspaceRenderAssets(
  workspace: WorkspaceContext
): Promise<RenderAsset[]> {
  return Promise.all(
    workspace.config.assets.map(async (asset) => ({
      id: asset.id,
      url: await fileToDataUrl(getWorkspaceAssetPath(workspace, asset))
    }))
  );
}

export async function resolveWorkspaceAsset(
  workspace: WorkspaceContext,
  assetId: string
): Promise<ResolvedLocalAsset | null> {
  const asset = workspace.config.assets.find((candidate) => candidate.id === assetId);

  if (!asset) {
    return null;
  }

  const absolutePath = getWorkspaceAssetPath(workspace, asset);

  return {
    id: asset.id,
    source: absolutePath,
    absolutePath,
    dataUrl: await fileToDataUrl(absolutePath),
    markdownUrl: `asset://${asset.id}`
  };
}

export function createLocalImageResolver(
  workspace: WorkspaceContext,
  markdownPath: string
): RenderImageSourceResolver {
  const dataUrlCache = new Map<string, Promise<string>>();

  return async ({ url }) => {
    const normalizedFileUrlPath = toFileUrlPath(url);
    const absolutePath = normalizedFileUrlPath
      ? path.resolve(normalizedFileUrlPath)
      : isAbsoluteFsPath(url)
        ? path.resolve(url)
        : path.resolve(path.dirname(markdownPath), url);

    try {
      await stat(absolutePath);
    } catch {
      return null;
    }

    if (!dataUrlCache.has(absolutePath)) {
      dataUrlCache.set(absolutePath, fileToDataUrl(absolutePath));
    }

    const dataUrl = await dataUrlCache.get(absolutePath)!;

    return {
      url: dataUrl
    };
  };
}
