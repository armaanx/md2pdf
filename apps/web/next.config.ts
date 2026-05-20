import path from "node:path";
import type { NextConfig } from "next";

const monorepoRoot = path.resolve(__dirname, "../..");

const rendererRuntimeAssets = ["./apps/web/renderer-assets/**"];

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
