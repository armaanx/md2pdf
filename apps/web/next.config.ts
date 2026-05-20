import path from "node:path";
import type { NextConfig } from "next";

const monorepoRoot = path.resolve(__dirname, "../..");

const rendererRuntimeAssets = [
  "./node_modules/mermaid/dist/mermaid.min.js",
  "./node_modules/@fontsource/manrope/files/manrope-latin-400-normal.woff2",
  "./node_modules/@fontsource/manrope/files/manrope-latin-500-normal.woff2",
  "./node_modules/@fontsource/manrope/files/manrope-latin-600-normal.woff2",
  "./node_modules/@fontsource/manrope/files/manrope-latin-700-normal.woff2",
  "./node_modules/@fontsource/manrope/files/manrope-latin-800-normal.woff2",
  "./node_modules/@fontsource/jetbrains-mono/files/jetbrains-mono-latin-400-normal.woff2",
  "./node_modules/@fontsource/jetbrains-mono/files/jetbrains-mono-latin-600-normal.woff2"
];

const nextConfig: NextConfig = {
  output: "standalone",
  transpilePackages: ["@md2pdf/renderer"],
  serverExternalPackages: ["@sparticuz/chromium", "playwright-core", "playwright"],
  turbopack: {
    root: monorepoRoot
  },
  outputFileTracingRoot: monorepoRoot,
  outputFileTracingIncludes: {
    "/api/convert": rendererRuntimeAssets,
    "/api/preview": rendererRuntimeAssets
  }
};

export default nextConfig;
