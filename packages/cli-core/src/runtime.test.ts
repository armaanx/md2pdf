import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { importWorkspaceAssets } from "./assets";
import { ensureWorkspace } from "./config";
import { listRenderHistory } from "./history";
import {
  derivePdfOutputPath,
  generatePreviewHtml,
  prepareDocument,
  recordHistory,
  validatePreparedDocument
} from "./runtime";

const PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9WnSUs8AAAAASUVORK5CYII=";

const tempDirs: string[] = [];

afterEach(async () => {
  while (tempDirs.length) {
    const nextDir = tempDirs.pop();

    if (!nextDir) {
      continue;
    }

    await import("node:fs/promises").then(({ rm }) =>
      rm(nextDir, { recursive: true, force: true })
    );
  }
});

async function createTempProject() {
  const rootDir = await mkdtemp(path.join(os.tmpdir(), "md2pdf-cli-core-"));
  tempDirs.push(rootDir);
  return rootDir;
}

describe("cli runtime", () => {
  it("resolves workspace assets and relative local images for preview/validation", async () => {
    const rootDir = await createTempProject();
    const imagesDir = path.join(rootDir, "images");
    await mkdir(imagesDir, { recursive: true });

    const importedImagePath = path.join(rootDir, "logo.png");
    const localImagePath = path.join(imagesDir, "chart.png");
    const markdownPath = path.join(rootDir, "report.md");

    await writeFile(importedImagePath, Buffer.from(PNG_BASE64, "base64"));
    await writeFile(localImagePath, Buffer.from(PNG_BASE64, "base64"));

    await ensureWorkspace(rootDir);
    const { imported } = await importWorkspaceAssets(rootDir, [importedImagePath]);

    await writeFile(
      markdownPath,
      `# Report\n\n![Imported](${imported[0]!.markdownUrl})\n\n![Local](./images/chart.png)\n`
    );

    const prepared = await prepareDocument(markdownPath);
    const validation = await validatePreparedDocument(prepared);
    const preview = await generatePreviewHtml(prepared);

    expect(validation.ok).toBe(true);
    expect(preview.validation.ok).toBe(true);
    expect(preview.html).toContain("data:image/png;base64");
  });

  it("records history entries and derives default output paths", async () => {
    const rootDir = await createTempProject();
    const markdownPath = path.join(rootDir, "report.md");

    await writeFile(markdownPath, "# Report\n");

    const prepared = await prepareDocument(markdownPath);
    const outputPath = derivePdfOutputPath(markdownPath, undefined, prepared.workspace);

    expect(outputPath).toBe(path.join(rootDir, "report.pdf"));

    await recordHistory(prepared.workspace, {
      kind: "render",
      inputPath: markdownPath,
      outputPath,
      title: "Report",
      themePreset: prepared.theme.presetId,
      status: "success",
      durationMs: 42,
      issueCount: 0
    });

    const history = await listRenderHistory(prepared.workspace, 5);

    expect(history).toHaveLength(1);
    expect(history[0]?.outputPath).toBe(outputPath);
  });
});
