import { cpSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const rendererRoot = path.join(repoRoot, "packages/renderer");
const assetsRoot = path.join(rendererRoot, "assets");
const rendererRequire = createRequire(path.join(rendererRoot, "package.json"));

const assets = [
  {
    modulePath: "mermaid/dist/mermaid.min.js",
    target: "mermaid.min.js"
  },
  {
    modulePath: "@fontsource/manrope/files/manrope-latin-400-normal.woff2",
    target: "manrope-latin-400-normal.woff2"
  },
  {
    modulePath: "@fontsource/manrope/files/manrope-latin-500-normal.woff2",
    target: "manrope-latin-500-normal.woff2"
  },
  {
    modulePath: "@fontsource/manrope/files/manrope-latin-600-normal.woff2",
    target: "manrope-latin-600-normal.woff2"
  },
  {
    modulePath: "@fontsource/manrope/files/manrope-latin-700-normal.woff2",
    target: "manrope-latin-700-normal.woff2"
  },
  {
    modulePath: "@fontsource/manrope/files/manrope-latin-800-normal.woff2",
    target: "manrope-latin-800-normal.woff2"
  },
  {
    modulePath: "@fontsource/jetbrains-mono/files/jetbrains-mono-latin-400-normal.woff2",
    target: "jetbrains-mono-latin-400-normal.woff2"
  },
  {
    modulePath: "@fontsource/jetbrains-mono/files/jetbrains-mono-latin-600-normal.woff2",
    target: "jetbrains-mono-latin-600-normal.woff2"
  }
];

mkdirSync(assetsRoot, { recursive: true });

for (const asset of assets) {
  cpSync(rendererRequire.resolve(asset.modulePath), path.join(assetsRoot, asset.target));
}

console.log("Synced renderer runtime assets into packages/renderer/assets.");
