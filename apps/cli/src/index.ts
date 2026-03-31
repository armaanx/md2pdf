import { mkdir, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import readline from "node:readline/promises";
import { pathToFileURL } from "node:url";
import chokidar from "chokidar";
import { Command } from "commander";
import getPort from "get-port";
import open from "open";
import {
  closeCliRenderer,
  derivePdfOutputPath,
  ensureWorkspace,
  generatePreviewHtml,
  importWorkspaceAssets,
  prepareDocument,
  recordHistory,
  renderPreparedDocument,
  resolveCliTheme,
  saveWorkspaceConfig,
  validatePreparedDocument
} from "@md2pdf/cli-core";
import { renderThemePresets } from "@md2pdf/renderer/theme";
import { failure, heading, muted, success, warning } from "./console";
import { startPreviewServer } from "./preview-server";
import { launchStudio } from "./studio";

function printValidationResult(
  validation: Awaited<ReturnType<typeof validatePreparedDocument>>,
  headingLabel = "Validation"
) {
  console.log(heading(headingLabel));

  if (validation.ok) {
    console.log(success("No validation issues found."));
    return;
  }

  for (const issue of validation.issues) {
    console.log(`- ${failure(issue.code)} ${issue.message}`);
  }
}

async function renderOnce(inputPath: string, options: {
  output?: string;
  title?: string;
  theme?: string;
  openOutput?: boolean;
}) {
  const startedAt = Date.now();
  const prepared = await prepareDocument(inputPath, {
    title: options.title,
    theme: options.theme
  });
  const outputPath = derivePdfOutputPath(prepared.inputPath, options.output, prepared.workspace);

  await mkdir(path.dirname(outputPath), { recursive: true });
  try {
    await renderPreparedDocument(prepared, outputPath);
    await recordHistory(prepared.workspace, {
      kind: "render",
      inputPath: prepared.inputPath,
      outputPath,
      title: prepared.title,
      themePreset: prepared.theme.presetId,
      status: "success",
      durationMs: Date.now() - startedAt,
      issueCount: 0
    });

    console.log(success(`Rendered ${path.basename(prepared.inputPath)} -> ${outputPath}`));

    if (options.openOutput) {
      await open(outputPath);
    }

    return outputPath;
  } finally {
    await closeCliRenderer();
  }
}

async function runRenderCommand(inputPath: string, options: {
  output?: string;
  title?: string;
  theme?: string;
  open?: boolean;
  watch?: boolean;
}) {
  await renderOnce(inputPath, {
    output: options.output,
    title: options.title,
    theme: options.theme,
    openOutput: options.open ?? false
  });

  if (!options.watch) {
    return;
  }

  console.log(muted("Watching markdown and workspace files for changes. Press Ctrl+C to stop."));
  const watcher = chokidar.watch([
    path.resolve(inputPath),
    path.join(path.dirname(path.resolve(inputPath)), ".md2pdf", "**", "*")
  ], {
    ignoreInitial: true
  });

  const rerender = async () => {
    try {
      await renderOnce(inputPath, {
        output: options.output,
        title: options.title,
        theme: options.theme,
        openOutput: false
      });
    } catch (error) {
      console.error(failure(error instanceof Error ? error.message : "Watch render failed."));
    }
  };

  watcher.on("all", () => void rerender());
  await new Promise<void>(() => undefined);
}

async function runPreviewCommand(inputPath: string, options: {
  title?: string;
  theme?: string;
  open?: boolean;
  watch?: boolean;
  port?: string;
}) {
  if (options.watch) {
    const prepared = await prepareDocument(inputPath, {
      title: options.title,
      theme: options.theme
    });
    const port = await getPort({
      port: options.port
        ? [Number(options.port)]
        : prepared.workspace.config.preview?.port
          ? [prepared.workspace.config.preview.port]
          : undefined
    });
    const server = await startPreviewServer(prepared.inputPath, port);

    console.log(success(`Preview server running at http://127.0.0.1:${port}`));

    if (options.open ?? true) {
      await open(`http://127.0.0.1:${port}`);
    }

    const watcher = chokidar.watch([
      prepared.inputPath,
      path.join(prepared.workspace.workspaceDir, "**", "*")
    ], {
      ignoreInitial: true
    });
    watcher.on("all", () => void server.refreshPreview());
    await new Promise<void>(() => undefined);
    return;
  }

  const startedAt = Date.now();
  const prepared = await prepareDocument(inputPath, {
    title: options.title,
    theme: options.theme
  });
  const preview = await generatePreviewHtml(prepared);
  const previewPath = path.join(
    os.tmpdir(),
    `${path.basename(prepared.inputPath, path.extname(prepared.inputPath))}.preview.html`
  );

  await writeFile(previewPath, preview.html, "utf8");
  await recordHistory(prepared.workspace, {
    kind: "preview",
    inputPath: prepared.inputPath,
    outputPath: previewPath,
    title: prepared.title,
    themePreset: prepared.theme.presetId,
    status: preview.validation.ok ? "success" : "error",
    durationMs: Date.now() - startedAt,
    issueCount: preview.validation.issues.length,
    notes: preview.validation.issues.map((issue) => issue.message).join("; ")
  });

  console.log(success(`Preview HTML written to ${previewPath}`));
  printValidationResult(preview.validation, "Preview validation");

  if (options.open ?? true) {
    await open(previewPath);
  }
}

async function runValidateCommand(inputPath: string, options: {
  title?: string;
  theme?: string;
}) {
  const startedAt = Date.now();
  const prepared = await prepareDocument(inputPath, {
    title: options.title,
    theme: options.theme
  });
  const validation = await validatePreparedDocument(prepared);

  await recordHistory(prepared.workspace, {
    kind: "validate",
    inputPath: prepared.inputPath,
    outputPath: null,
    title: prepared.title,
    themePreset: prepared.theme.presetId,
    status: validation.ok ? "success" : "error",
    durationMs: Date.now() - startedAt,
    issueCount: validation.issues.length,
    notes: validation.issues.map((issue) => issue.message).join("; ")
  });

  printValidationResult(validation);

  if (!validation.ok) {
    process.exitCode = 1;
  }
}

async function runInitCommand(targetDir = ".") {
  const rootDir = path.resolve(targetDir);
  const workspace = await ensureWorkspace(rootDir);
  const samplePath = path.join(rootDir, "sample.md");

  await writeFile(
    samplePath,
    `# md2pdf workspace\n\nThis directory is ready for local preview and PDF export.\n\n- Managed assets live in \`.md2pdf/assets\`\n- Theme config lives in \`.md2pdf/config.json\`\n`,
    "utf8"
  );

  console.log(success(`Initialized workspace in ${workspace.rootDir}`));
  console.log(muted(`Sample document: ${samplePath}`));
}

async function runAssetImportCommand(files: string[]) {
  const { imported, workspace } = await importWorkspaceAssets(process.cwd(), files);

  console.log(success(`Imported ${imported.length} asset(s) into ${workspace.assetsDir}`));
  for (const asset of imported) {
    console.log(`- ${asset.originalName} -> ${asset.markdownUrl}`);
  }
}

async function runThemeExportCommand(outputPath?: string, themeOption?: string) {
  const workspace = await ensureWorkspace(process.cwd());
  const theme = await resolveCliTheme(workspace, themeOption);
  const payload = {
    presetId: theme.presetId,
    theme: theme.resolvedTheme
  };
  const destination = path.resolve(outputPath ?? path.join(workspace.workspaceDir, "theme.export.json"));

  await writeFile(destination, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  console.log(success(`Theme exported to ${destination}`));
}

async function runThemeEditCommand() {
  const workspace = await ensureWorkspace(process.cwd());
  const terminal = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  try {
    console.log(heading("Theme presets"));
    renderThemePresets.forEach((preset, index) => {
      console.log(`${index + 1}. ${preset.label} (${preset.id})`);
    });

    const rawChoice = await terminal.question(
      `Choose a theme preset [${workspace.config.themePreset}]: `
    );
    const presetIndex = Number.parseInt(rawChoice, 10);
    const presetId =
      Number.isInteger(presetIndex) &&
      presetIndex >= 1 &&
      presetIndex <= renderThemePresets.length
        ? renderThemePresets[presetIndex - 1]!.id
        : workspace.config.themePreset;
    const defaultOutputDir = await terminal.question(
      `Default output directory [${workspace.config.defaultOutputDir ?? ""}]: `
    );

    await saveWorkspaceConfig(workspace, {
      ...workspace.config,
      themePreset: presetId,
      defaultOutputDir: defaultOutputDir.trim() || null
    });
  } finally {
    terminal.close();
  }

  console.log(success("Updated workspace theme settings."));
}

async function runSetupCommand() {
  const require = createRequire(import.meta.url);

  let playwrightCliPath: string;

  try {
    playwrightCliPath = require.resolve("playwright/cli");
  } catch {
    console.error(failure("Playwright CLI is not available in this installation."));
    process.exitCode = 1;
    return;
  }

  await new Promise<void>((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [playwrightCliPath, "install", "chromium"],
      {
        stdio: "inherit",
        env: {
          ...process.env,
          PLAYWRIGHT_BROWSERS_PATH: "0"
        }
      }
    );

    child.once("error", reject);
    child.once("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`Playwright install exited with code ${code ?? 1}.`));
    });
  });

  console.log(success("Chromium runtime installed locally for md2pdf."));
}

export function buildProgram() {
  const program = new Command();

  program
    .name("md2pdf")
    .description("Local markdown-to-PDF CLI and studio")
    .version("0.1.0");

  program
    .command("render")
    .argument("<input>", "Markdown file")
    .option("-o, --output <file>", "Output PDF path")
    .option("--title <title>", "Document title")
    .option("--theme <preset-or-file>", "Theme preset id or JSON file")
    .option("--open", "Open the generated PDF")
    .option("--watch", "Re-render on file changes")
    .action(runRenderCommand);

  program
    .command("preview")
    .argument("<input>", "Markdown file")
    .option("--title <title>", "Document title")
    .option("--theme <preset-or-file>", "Theme preset id or JSON file")
    .option("--open", "Open the preview")
    .option("--watch", "Start a local live-preview server")
    .option("--port <port>", "Preview server port")
    .action(runPreviewCommand);

  program
    .command("validate")
    .argument("<input>", "Markdown file")
    .option("--title <title>", "Document title")
    .option("--theme <preset-or-file>", "Theme preset id or JSON file")
    .action(runValidateCommand);

  program.command("studio").argument("[input]", "Markdown file").option("--theme <preset-or-file>").action(launchStudio);

  program.command("init").argument("[dir]", "Workspace directory").action(runInitCommand);

  const assets = program.command("assets");
  assets.command("import").argument("<files...>", "Files to import").action(runAssetImportCommand);

  const themes = program.command("themes");
  themes.command("export").argument("[output]", "Destination JSON path").option("--theme <preset-or-file>").action((output, options) => runThemeExportCommand(output, options.theme));
  themes.command("edit").action(runThemeEditCommand);

  program.command("setup").description("Install the local Chromium runtime").action(runSetupCommand);

  return program;
}

export async function runCli(argv = process.argv) {
  await buildProgram().parseAsync(argv);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  void runCli(process.argv);
}
