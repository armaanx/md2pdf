import { cpSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const rendererRoot = path.join(repoRoot, "packages/renderer");
const rendererRequire = createRequire(path.join(rendererRoot, "package.json"));

const assets = [
  {
    modulePath: "mermaid/dist/mermaid.min.js",
    target: "mermaid/dist/mermaid.min.js"
  },
  {
    modulePath: "@fontsource/manrope/files/manrope-latin-400-normal.woff2",
    target: "@fontsource/manrope/files/manrope-latin-400-normal.woff2"
  },
  {
    modulePath: "@fontsource/manrope/files/manrope-latin-500-normal.woff2",
    target: "@fontsource/manrope/files/manrope-latin-500-normal.woff2"
  },
  {
    modulePath: "@fontsource/manrope/files/manrope-latin-600-normal.woff2",
    target: "@fontsource/manrope/files/manrope-latin-600-normal.woff2"
  },
  {
    modulePath: "@fontsource/manrope/files/manrope-latin-700-normal.woff2",
    target: "@fontsource/manrope/files/manrope-latin-700-normal.woff2"
  },
  {
    modulePath: "@fontsource/manrope/files/manrope-latin-800-normal.woff2",
    target: "@fontsource/manrope/files/manrope-latin-800-normal.woff2"
  },
  {
    modulePath: "@fontsource/jetbrains-mono/files/jetbrains-mono-latin-400-normal.woff2",
    target: "@fontsource/jetbrains-mono/files/jetbrains-mono-latin-400-normal.woff2"
  },
  {
    modulePath: "@fontsource/jetbrains-mono/files/jetbrains-mono-latin-600-normal.woff2",
    target: "@fontsource/jetbrains-mono/files/jetbrains-mono-latin-600-normal.woff2"
  }
];

for (const asset of assets) {
  const sourcePath = rendererRequire.resolve(asset.modulePath);
  const targetPath = path.join(repoRoot, "node_modules", asset.target);

  mkdirSync(path.dirname(targetPath), { recursive: true });
  cpSync(sourcePath, targetPath);
}

console.log("Synced renderer runtime assets into node_modules for deployment.");
