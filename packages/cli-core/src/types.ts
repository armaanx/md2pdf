import type { RenderThemeConfig, RenderThemePresetId } from "@md2pdf/renderer/theme";

export type WorkspaceAssetRecord = {
  id: string;
  fileName: string;
  originalName: string;
  importedAt: string;
  sizeBytes: number;
};

export type WorkspaceConfig = {
  version: 1;
  themePreset: RenderThemePresetId;
  theme?: Partial<RenderThemeConfig>;
  assets: WorkspaceAssetRecord[];
  defaultOutputDir?: string | null;
  preview?: {
    port?: number;
  };
};

export type WorkspaceContext = {
  exists: boolean;
  rootDir: string;
  workspaceDir: string;
  configPath: string;
  assetsDir: string;
  historyPath: string;
  config: WorkspaceConfig;
};

export type ResolvedLocalAsset = {
  id?: string;
  source: string;
  absolutePath: string;
  dataUrl: string;
  markdownUrl: string;
};

export type CliThemeReference = {
  presetId: RenderThemePresetId;
  source: "default" | "workspace" | "preset" | "file";
  resolvedTheme: RenderThemeConfig;
  overrides?: Partial<RenderThemeConfig>;
};

export type RenderHistoryEntry = {
  id: string;
  kind: "render" | "preview" | "validate";
  inputPath: string;
  outputPath?: string | null;
  title: string;
  themePreset: RenderThemePresetId;
  status: "success" | "error";
  createdAt: string;
  durationMs: number;
  issueCount: number;
  notes?: string;
};

export type PreviewSessionState = {
  id: string;
  port: number;
  inputPath: string;
  watched: boolean;
  themePreset: RenderThemePresetId;
  startedAt: string;
  lastRenderedAt: string | null;
  issueCount: number;
  openUrl: string;
};

export type ThemeFileInput = {
  presetId?: RenderThemePresetId;
  theme?: Partial<RenderThemeConfig>;
};
