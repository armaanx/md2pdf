import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const targetScript = path.join(scriptDir, "render-markdown-pdf.ts");

const result = spawnSync(
  process.execPath,
  [path.join(process.cwd(), "node_modules", "tsx", "dist", "cli.mjs"), targetScript, ...process.argv.slice(2)],
  {
    stdio: "inherit",
    windowsHide: true
  }
);

if (result.error) {
  throw result.error;
}

process.exit(result.status ?? 0);

