import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  renderMarkdownToHtml,
  validateMarkdownWithResolver,
  type ValidationResult
} from "@md2pdf/renderer/html";
import { closeRendererBrowser, renderMarkdownToPdf } from "@md2pdf/renderer/pdf";
import { appendRenderHistory } from "./history";
import { buildWorkspaceRenderAssets, createLocalImageResolver } from "./assets";
import { loadWorkspace } from "./config";
import { resolveCliTheme } from "./theme";
import type { CliThemeReference, RenderHistoryEntry, WorkspaceContext } from "./types";

export type PreparedDocument = {
  inputPath: string;
  markdown: string;
  title: string;
  workspace: WorkspaceContext;
  theme: CliThemeReference;
  renderAssets: Awaited<ReturnType<typeof buildWorkspaceRenderAssets>>;
  resolveImageSource: ReturnType<typeof createLocalImageResolver>;
};

export async function prepareDocument(inputPath: string, options: { title?: string; theme?: string } = {}) {
  const absoluteInputPath = path.resolve(inputPath);
  const markdown = await readFile(absoluteInputPath, "utf8");
  const workspace = await loadWorkspace(path.dirname(absoluteInputPath));
  const theme = await resolveCliTheme(workspace, options.theme);
  const renderAssets = await buildWorkspaceRenderAssets(workspace);

  return {
    inputPath: absoluteInputPath,
    markdown,
    title: options.title ?? path.basename(absoluteInputPath, path.extname(absoluteInputPath)),
    workspace,
    theme,
    renderAssets,
    resolveImageSource: createLocalImageResolver(workspace, absoluteInputPath)
  } satisfies PreparedDocument;
}

export function derivePdfOutputPath(inputPath: string, outputArg?: string, workspace?: WorkspaceContext) {
  if (outputArg) {
    return path.resolve(outputArg);
  }

  const baseName = `${path.basename(inputPath, path.extname(inputPath))}.pdf`;

  if (workspace?.config.defaultOutputDir) {
    return path.resolve(workspace.rootDir, workspace.config.defaultOutputDir, baseName);
  }

  return path.join(path.dirname(inputPath), baseName);
}

export async function validatePreparedDocument(prepared: PreparedDocument): Promise<ValidationResult> {
  return validateMarkdownWithResolver({
    markdown: prepared.markdown,
    assets: prepared.renderAssets,
    resolveImageSource: prepared.resolveImageSource
  });
}

export async function generatePreviewHtml(prepared: PreparedDocument) {
  return renderMarkdownToHtml({
    markdown: prepared.markdown,
    assets: prepared.renderAssets,
    options: {
      title: prepared.title,
      theme: prepared.theme.resolvedTheme
    },
    resolveImageSource: prepared.resolveImageSource
  });
}

export async function renderPreparedDocument(prepared: PreparedDocument, outputPath: string) {
  const pdf = await renderMarkdownToPdf({
    markdown: prepared.markdown,
    assets: prepared.renderAssets,
    options: {
      title: prepared.title,
      theme: prepared.theme.resolvedTheme
    },
    resolveImageSource: prepared.resolveImageSource
  });

  await writeFile(outputPath, pdf);
}

export async function closeCliRenderer() {
  await closeRendererBrowser();
}

export async function recordHistory(
  workspace: WorkspaceContext,
  entry: Omit<RenderHistoryEntry, "id" | "createdAt">
) {
  await appendRenderHistory(workspace, {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    ...entry
  });
}
