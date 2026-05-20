import path from "node:path";
import type { NextConfig } from "next";

const monorepoRoot = path.resolve(__dirname, "../..");

const rendererRuntimeAssets = [
  "./node_modules/.pnpm/mermaid@*/node_modules/mermaid/dist/mermaid.min.js",
  "./node_modules/.pnpm/@fontsource+manrope@*/node_modules/@fontsource/manrope/files/**",
  "./node_modules/.pnpm/@fontsource+jetbrains-mono@*/node_modules/@fontsource/jetbrains-mono/files/**"
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
