import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  getRenderThemePreset,
  renderThemePresets,
  resolveRenderTheme,
  type RenderThemePresetId
} from "@md2pdf/renderer/theme";
import { z } from "zod";
import { partialRenderThemeSchema } from "./config";
import type { CliThemeReference, ThemeFileInput, WorkspaceContext } from "./types";

const presetIds = new Set(renderThemePresets.map((preset) => preset.id));

const themeFileSchema = z.union([
  partialRenderThemeSchema,
  z
    .object({
      presetId: z
        .enum(renderThemePresets.map((preset) => preset.id) as [
          RenderThemePresetId,
          ...RenderThemePresetId[]
        ])
        .optional(),
      theme: partialRenderThemeSchema.optional()
    })
    .strict()
]);

function isThemeFileInput(value: ThemeFileInput | Record<string, unknown>): value is ThemeFileInput {
  return "presetId" in value || "theme" in value;
}

function isThemePresetId(value: string): value is RenderThemePresetId {
  return presetIds.has(value as RenderThemePresetId);
}

export async function resolveCliTheme(
  workspace: WorkspaceContext,
  themeOption?: string
): Promise<CliThemeReference> {
  if (!themeOption) {
    const presetId = workspace.config.themePreset;
    return {
      presetId,
      source: workspace.exists ? "workspace" : "default",
      overrides: workspace.config.theme,
      resolvedTheme: resolveRenderTheme({
        ...getRenderThemePreset(presetId),
        ...workspace.config.theme
      })
    };
  }

  if (isThemePresetId(themeOption)) {
    return {
      presetId: themeOption,
      source: "preset",
      resolvedTheme: resolveRenderTheme(getRenderThemePreset(themeOption))
    };
  }

  const themePath = path.resolve(workspace.rootDir, themeOption);
  const raw = await readFile(themePath, "utf8");
  const parsed = themeFileSchema.parse(JSON.parse(raw)) as ThemeFileInput | Record<string, unknown>;
  const fileInput: ThemeFileInput = isThemeFileInput(parsed) ? parsed : { theme: parsed };
  const presetId = fileInput.presetId ?? workspace.config.themePreset;
  const overrides = fileInput.theme ?? {};

  return {
    presetId,
    source: "file",
    overrides,
    resolvedTheme: resolveRenderTheme({
      ...getRenderThemePreset(presetId),
      ...overrides
    })
  };
}
