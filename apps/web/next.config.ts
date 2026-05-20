import path from "node:path";
import type { NextConfig } from "next";

const monorepoRoot = path.resolve(__dirname, "../..");

const nextConfig: NextConfig = {
  output: "standalone",
  transpilePackages: ["@md2pdf/renderer"],
  serverExternalPackages: ["playwright"],
  turbopack: {
    root: monorepoRoot
  },
  outputFileTracingRoot: monorepoRoot
};

export default nextConfig;
