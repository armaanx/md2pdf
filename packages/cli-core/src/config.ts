import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  getDefaultRenderTheme,
  renderThemePresets,
  resolveRenderTheme,
  type RenderThemePresetId
} from "@md2pdf/renderer/theme";
import { z } from "zod";
import type { WorkspaceConfig, WorkspaceContext } from "./types";

export const WORKSPACE_DIR_NAME = ".md2pdf";
export const CONFIG_FILE_NAME = "config.json";
export const HISTORY_FILE_NAME = "history.jsonl";
export const ASSETS_DIR_NAME = "assets";

const presetIds = renderThemePresets.map((preset) => preset.id) as [
  RenderThemePresetId,
  ...RenderThemePresetId[]
];

const hexColorSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/);
const renderThemeFontSchema = z.enum([
  "manrope",
  "systemSans",
  "avenir",
  "optima",
  "georgia",
  "garamond",
  "baskerville",
  "palatino",
  "mono"
]);

export const partialRenderThemeSchema = z
  .object({
    bodyFont: renderThemeFontSchema.optional(),
    headingFont: renderThemeFontSchema.optional(),
    fontSize: z.number().int().min(12).max(20).optional(),
    lineHeight: z.number().min(1.2).max(2).optional(),
    pagePadding: z.number().int().min(28).max(88).optional(),
    pageRadius: z.number().int().min(0).max(28).optional(),
    h1Size: z.number().int().min(22).max(42).optional(),
    h2Size: z.number().int().min(16).max(32).optional(),
    h3Size: z.number().int().min(14).max(26).optional(),
    backgroundColor: hexColorSchema.optional(),
    sheetColor: hexColorSchema.optional(),
    textColor: hexColorSchema.optional(),
    mutedColor: hexColorSchema.optional(),
    lineColor: hexColorSchema.optional(),
    accentColor: hexColorSchema.optional(),
    accentSoftColor: hexColorSchema.optional(),
    codeBackground: hexColorSchema.optional(),
    codeText: hexColorSchema.optional(),
    tableHeadColor: hexColorSchema.optional(),
    blockquoteColor: hexColorSchema.optional(),
    shadowEnabled: z.boolean().optional(),
    shadowColor: hexColorSchema.optional(),
    shadowBlur: z.number().int().min(0).max(100).optional(),
    shadowOpacity: z.number().min(0).max(0.5).optional(),
    shadowOffsetY: z.number().int().min(0).max(40).optional()
  })
  .strict();

const workspaceAssetSchema = z
  .object({
    id: z.string().min(1),
    fileName: z.string().min(1),
    originalName: z.string().min(1),
    importedAt: z.string().min(1),
    sizeBytes: z.number().int().nonnegative()
  })
  .strict();

const workspaceConfigSchema = z
  .object({
    version: z.literal(1).default(1),
    themePreset: z.enum(presetIds).default("studio"),
    theme: partialRenderThemeSchema.optional(),
    assets: z.array(workspaceAssetSchema).default([]),
    defaultOutputDir: z.string().trim().min(1).nullable().optional(),
    preview: z
      .object({
        port: z.number().int().positive().max(65535).optional()
      })
      .strict()
      .optional()
  })
  .strict();

export function createDefaultWorkspaceConfig(): WorkspaceConfig {
  resolveRenderTheme(getDefaultRenderTheme());

  return {
    version: 1,
    themePreset: "studio",
    assets: []
  };
}

function getWorkspacePaths(rootDir: string) {
  const workspaceDir = path.join(rootDir, WORKSPACE_DIR_NAME);
  return {
    workspaceDir,
    configPath: path.join(workspaceDir, CONFIG_FILE_NAME),
    assetsDir: path.join(workspaceDir, ASSETS_DIR_NAME),
    historyPath: path.join(workspaceDir, HISTORY_FILE_NAME)
  };
}

async function pathExists(targetPath: string) {
  try {
    await readFile(targetPath, "utf8");
    return true;
  } catch {
    return false;
  }
}

export async function findWorkspaceRoot(startDir: string) {
  let currentDir = path.resolve(startDir);

  while (true) {
    const { configPath } = getWorkspacePaths(currentDir);

    if (await pathExists(configPath)) {
      return currentDir;
    }

    const parentDir = path.dirname(currentDir);

    if (parentDir === currentDir) {
      return null;
    }

    currentDir = parentDir;
  }
}

export async function loadWorkspace(
  startDir: string,
  options: { createIfMissing?: boolean } = {}
): Promise<WorkspaceContext> {
  const discoveredRoot = await findWorkspaceRoot(startDir);
  const rootDir = discoveredRoot ?? path.resolve(startDir);
  const { workspaceDir, configPath, assetsDir, historyPath } = getWorkspacePaths(rootDir);
  const exists = Boolean(discoveredRoot) || (await pathExists(configPath));

  if (!exists && options.createIfMissing) {
    await mkdir(assetsDir, { recursive: true });
    const defaultConfig = createDefaultWorkspaceConfig();
    await writeFile(configPath, `${JSON.stringify(defaultConfig, null, 2)}\n`, "utf8");

    return {
      exists: true,
      rootDir,
      workspaceDir,
      configPath,
      assetsDir,
      historyPath,
      config: defaultConfig
    };
  }

  if (exists) {
    const raw = await readFile(configPath, "utf8");
    const parsed = workspaceConfigSchema.parse(JSON.parse(raw));

    return {
      exists: true,
      rootDir,
      workspaceDir,
      configPath,
      assetsDir,
      historyPath,
      config: parsed
    };
  }

  return {
    exists: false,
    rootDir,
    workspaceDir,
    configPath,
    assetsDir,
    historyPath,
    config: createDefaultWorkspaceConfig()
  };
}

export async function saveWorkspaceConfig(
  workspace: WorkspaceContext,
  config: WorkspaceConfig
) {
  const parsed = workspaceConfigSchema.parse(config);
  await mkdir(workspace.assetsDir, { recursive: true });
  await writeFile(workspace.configPath, `${JSON.stringify(parsed, null, 2)}\n`, "utf8");

  return {
    ...workspace,
    exists: true,
    config: parsed
  } satisfies WorkspaceContext;
}

export async function ensureWorkspace(startDir: string) {
  return loadWorkspace(startDir, { createIfMissing: true });
}
