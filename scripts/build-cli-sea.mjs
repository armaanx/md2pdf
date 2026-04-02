import { copyFile, mkdir, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SEA_FUSE = "NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..");
const cliDir = path.join(repoRoot, "apps", "cli");
const distDir = path.join(cliDir, "dist");
const entryPath = path.join(distDir, "index.mjs");
const seaEntryPath = path.join(distDir, "sea-entry.cjs");
const seaConfigPath = path.join(distDir, "sea-config.json");
const seaBlobPath = path.join(distDir, "md2pdf.blob");
const releaseDir = path.join(distDir, "release");
const releaseAppDir = path.join(releaseDir, "app");
const binaryName = process.platform === "win32" ? "md2pdf.exe" : "md2pdf";
const binaryPath = path.join(releaseDir, binaryName);
const browsersNotePath = path.join(releaseDir, "README.txt");
const postjectCliPath = path.join(repoRoot, "node_modules", "postject", "dist", "cli.js");

function runPnpm(args) {
  if (process.platform === "win32") {
    return spawnSync("cmd.exe", ["/c", "pnpm", ...args], {
      cwd: repoRoot,
      stdio: "inherit"
    });
  }

  return spawnSync("pnpm", args, {
    cwd: repoRoot,
    stdio: "inherit"
  });
}

if (!existsSync(entryPath)) {
  console.error("CLI bundle not found. Run `pnpm --filter md2pdf build` first.");
  process.exit(1);
}

await rm(releaseDir, { recursive: true, force: true });
await mkdir(releaseDir, { recursive: true });
await writeFile(
  seaEntryPath,
  [
    'const path = require("node:path");',
    'const { pathToFileURL } = require("node:url");',
    "(async () => {",
    '  const releaseDir = path.dirname(process.execPath);',
    '  const cliEntryUrl = pathToFileURL(path.join(releaseDir, "app", "dist", "index.mjs")).href;',
    "  const cli = await import(cliEntryUrl);",
    "  await cli.runCli(process.argv);",
    "})().catch((error) => {",
    "  console.error(error);",
    "  process.exit(1);",
    "});"
  ].join("\n"),
  "utf8"
);

await writeFile(
  seaConfigPath,
  `${JSON.stringify(
    {
      main: seaEntryPath,
      output: seaBlobPath,
      disableExperimentalSEAWarning: true
    },
    null,
    2
  )}\n`,
  "utf8"
);

const seaPrep = spawnSync(
  process.execPath,
  [`--experimental-sea-config=${seaConfigPath}`],
  {
    cwd: repoRoot,
    stdio: "inherit"
  }
);

if (seaPrep.status !== 0) {
  process.exit(seaPrep.status ?? 1);
}

await copyFile(process.execPath, binaryPath);
const deploy = runPnpm(["--filter", "md2pdf", "deploy", "--prod", "--legacy", releaseAppDir]);

if (deploy.error) {
  throw deploy.error;
}

if (deploy.status !== 0) {
  process.exit(deploy.status ?? 1);
}

const postject = spawnSync(
  process.execPath,
  [
    postjectCliPath,
    binaryPath,
    "NODE_SEA_BLOB",
    seaBlobPath,
    "--sentinel-fuse",
    SEA_FUSE,
    "--overwrite"
  ],
  { cwd: repoRoot, stdio: "inherit" }
);

if (postject.error) {
  throw postject.error;
}

if (postject.status !== 0) {
  process.exit(postject.status ?? 1);
}

await writeFile(
  browsersNotePath,
  [
    "This release packages the md2pdf CLI binary for the current platform.",
    "Playwright browser binaries are not embedded by this script yet.",
    "Run `md2pdf setup` on first launch to install Chromium next to the CLI runtime."
  ].join("\n"),
  "utf8"
);

console.log(`SEA package written to ${releaseDir}`);
